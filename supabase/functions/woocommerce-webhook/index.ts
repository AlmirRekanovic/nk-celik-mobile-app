import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WooCommerceOrder {
  id: number;
  order_key: string;
  number: string;
  status: string;
  currency: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    sku: string;
    price: number;
    total: string;
    meta_data?: Array<{
      key: string;
      value: string;
    }>;
  }>;
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // WooCommerce signs every delivery with base64(HMAC-SHA256(raw body,
    // webhook secret)). Without this check anyone who knows the URL can
    // mint tickets by POSTing a fake "completed" order.
    const webhookSecret = Deno.env.get('WC_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('WC_WEBHOOK_SECRET is not configured — rejecting all deliveries');
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-wc-webhook-signature') ?? '';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const digest = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
    );
    const expected = btoa(String.fromCharCode(...digest));

    if (signature.length !== expected.length ||
        !signature.split('').every((c, i) => c === expected[i])) {
      console.warn('Invalid webhook signature — rejecting');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let order: WooCommerceOrder;
    try {
      order = JSON.parse(rawBody);
    } catch {
      // WooCommerce sends a form-encoded ping when the webhook is first
      // saved; acknowledge it so the webhook activates.
      console.log('Non-JSON delivery (webhook ping) — acknowledging');
      return new Response(
        JSON.stringify({ message: 'Ping acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received WooCommerce order:', order.id);

    // Only process completed orders
    if (order.status !== 'completed' && order.status !== 'processing') {
      console.log('Order not completed/processing, skipping:', order.status);
      return new Response(
        JSON.stringify({ message: 'Order not completed yet' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const customerEmail = order.billing.email.toLowerCase().trim();
    const customerName = `${order.billing.first_name} ${order.billing.last_name}`.trim();

    // Try to find member by email
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle();

    console.log('Member found:', member ? member.id : 'none');

    // Create ticket for each line item
    const ticketsToInsert = [];

    for (const item of order.line_items) {
      let eventName = item.name;
      let eventDate: string | null = null;
      let isSeasonTicket = false;

      if (item.meta_data) {
        const eventNameMeta = item.meta_data.find(m => m.key === 'event_name' || m.key === '_event_name');
        const eventDateMeta = item.meta_data.find(m => m.key === 'event_date' || m.key === '_event_date');
        const seasonFlagMeta = item.meta_data.find(m => m.key === 'is_season_ticket' || m.key === '_is_season_ticket');
        const categoryMeta = item.meta_data.find(m => m.key === '_product_categories' || m.key === 'product_categories');

        if (eventNameMeta) eventName = eventNameMeta.value;
        if (eventDateMeta) eventDate = eventDateMeta.value;

        if (seasonFlagMeta) {
          const v = String(seasonFlagMeta.value).toLowerCase().trim();
          isSeasonTicket = v === 'true' || v === '1' || v === 'yes' || v === 'on';
        }

        if (!isSeasonTicket && categoryMeta) {
          isSeasonTicket = /sezonsk|season/i.test(String(categoryMeta.value));
        }
      }

      if (!isSeasonTicket) {
        isSeasonTicket = /sezonsk|season/i.test(item.name);
      }

      for (let i = 0; i < item.quantity; i++) {
        // Random suffix so codes can't be derived from sequential order
        // numbers; the order number prefix stays for human readability.
        const randomBytes = new Uint8Array(6);
        crypto.getRandomValues(randomBytes);
        const suffix = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
        const qrCode = `${order.number}-${suffix}`;

        ticketsToInsert.push({
          order_id: order.id,
          product_id: item.product_id,
          ticket_code: qrCode,
          ticket_type: item.name,
          customer_email: customerEmail,
          customer_name: customerName,
          member_id: member?.id || null,
          event_name: eventName,
          event_date: eventDate,
          status: 'active',
          is_season_ticket: isSeasonTicket,
        });
      }
    }

    console.log('Inserting tickets:', ticketsToInsert.length);

    // Insert all tickets
    const { data: tickets, error: insertError } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting tickets:', insertError);
      throw insertError;
    }

    console.log('Tickets created successfully:', tickets?.length);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${tickets?.length || 0} ticket(s) created`,
        tickets: tickets,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});