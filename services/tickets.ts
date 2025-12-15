import { supabase } from './supabase';
import { Ticket } from '@/types/products';

export async function fetchTicketByCode(ticketCode: string): Promise<Ticket | null> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_code', ticketCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching ticket:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
}

export async function fetchMemberTickets(memberId: string): Promise<Ticket[]> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching member tickets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching member tickets:', error);
    return [];
  }
}

export async function fetchAllTickets(
  page: number = 1,
  limit: number = 100
): Promise<Ticket[]> {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching all tickets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    return [];
  }
}

export async function fetchTicketsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching tickets count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error fetching tickets count:', error);
    return 0;
  }
}

export async function checkInTicket(
  ticketCode: string,
  checkedInBy: string,
  location?: string,
  notes?: string
): Promise<{ success: boolean; message: string; ticket?: Ticket }> {
  try {
    const ticket = await fetchTicketByCode(ticketCode);

    if (!ticket) {
      return { success: false, message: 'Karta nije pronađena' };
    }

    if (ticket.status === 'used') {
      const { data: checkIn } = await supabase
        .from('ticket_checkins')
        .select('checked_in_at')
        .eq('ticket_id', ticket.id)
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const checkInTime = checkIn?.checked_in_at
        ? new Date(checkIn.checked_in_at).toLocaleString('sr-BA')
        : 'nepoznato';

      return {
        success: false,
        message: `Karta je već skenirana (${checkInTime})`,
        ticket,
      };
    }

    if (ticket.status === 'cancelled') {
      return {
        success: false,
        message: 'Karta je otkazana',
        ticket,
      };
    }

    const { error: checkInError } = await supabase
      .from('ticket_checkins')
      .insert({
        ticket_id: ticket.id,
        checked_in_by: checkedInBy,
        location: location || '',
        notes: notes || '',
      });

    if (checkInError) {
      console.error('Error creating check-in:', checkInError);
      return { success: false, message: 'Greška pri check-in-u' };
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'used',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (updateError) {
      console.error('Error updating ticket status:', updateError);
      return { success: false, message: 'Greška pri ažuriranju statusa karte' };
    }

    return {
      success: true,
      message: 'Karta uspješno skenirana!',
      ticket: { ...ticket, status: 'used' },
    };
  } catch (error) {
    console.error('Error checking in ticket:', error);
    return { success: false, message: 'Greška pri skeniranju karte' };
  }
}

export async function createTicket(ticketData: Partial<Ticket>): Promise<Ticket | null> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        order_id: ticketData.order_id,
        product_id: ticketData.product_id,
        ticket_code: ticketData.ticket_code,
        ticket_type: ticketData.ticket_type || '',
        customer_email: ticketData.customer_email || '',
        customer_name: ticketData.customer_name || '',
        member_id: ticketData.member_id,
        event_name: ticketData.event_name || '',
        event_date: ticketData.event_date,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating ticket:', error);
    return null;
  }
}

export async function fetchTicketCheckIns(ticketId: string) {
  try {
    const { data, error } = await supabase
      .from('ticket_checkins')
      .select(`
        *,
        checked_in_by_member:members!ticket_checkins_checked_in_by_fkey(
          first_name,
          last_name,
          member_id
        )
      `)
      .eq('ticket_id', ticketId)
      .order('checked_in_at', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return [];
  }
}
