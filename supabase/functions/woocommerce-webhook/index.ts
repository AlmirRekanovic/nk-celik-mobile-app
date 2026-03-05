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

    const order: WooCommerceOrder = await req.json();

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
      // Create one ticket per quantity
      for (let i = 0; i < item.quantity; i++) {
        // Extract event details from meta_data if available
        let eventName = item.name;
        let eventDate = null;

        if (item.meta_data) {
          const eventNameMeta = item.meta_data.find(m => m.key === 'event_name' || m.key === '_event_name');
          const eventDateMeta = item.meta_data.find(m => m.key === 'event_date' || m.key === '_event_date');

          if (eventNameMeta) eventName = eventNameMeta.value;
          if (eventDateMeta) eventDate = eventDateMeta.value;
        }

        // Generate QR code in format: orderNumber-sequenceNumber
        const qrCode = `${order.number}-${i + 1}`;

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