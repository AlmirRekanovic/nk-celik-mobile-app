import { supabase } from './supabase';
import { Ticket } from '@/types/products';

type TicketKind = 'match' | 'season' | 'all';

function applyKind(
  query: ReturnType<ReturnType<typeof supabase.from>['select']>,
  kind: TicketKind
) {
  if (kind === 'season') return query.eq('is_season_ticket', true);
  if (kind === 'match') return query.eq('is_season_ticket', false);
  return query;
}

export async function fetchMemberTickets(
  memberId: string,
  kind: TicketKind = 'all'
): Promise<Ticket[]> {
  try {
    let query = supabase
      .from('tickets')
      .select('*')
      .eq('member_id', memberId);

    query = applyKind(query, kind);

    const { data, error } = await query.order('created_at', { ascending: false });

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

export async function fetchTicketsByEmail(
  email: string,
  kind: TicketKind = 'all'
): Promise<Ticket[]> {
  try {
    let query = supabase
      .from('tickets')
      .select('*')
      .eq('customer_email', email);

    query = applyKind(query, kind);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets by email:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tickets by email:', error);
    return [];
  }
}

// Check-in runs entirely inside the check_in_ticket RPC: the status flip is
// a single atomic UPDATE (two scanners can't both succeed) and the admin
// check happens server-side against the caller's JWT.
export async function checkInTicket(
  ticketCode: string,
  location?: string,
  notes?: string
): Promise<{ success: boolean; message: string; ticket?: Ticket }> {
  try {
    const { data, error } = await supabase.rpc('check_in_ticket', {
      p_ticket_code: ticketCode,
      p_location: location || '',
      p_notes: notes || '',
    });

    if (error) {
      console.error('Error checking in ticket:', error);
      return { success: false, message: 'Greška pri skeniranju karte' };
    }

    const ticket: Ticket | undefined = data?.ticket ?? undefined;

    switch (data?.code) {
      case 'ok':
        return { success: true, message: 'Karta uspješno skenirana!', ticket };
      case 'not_found':
        return { success: false, message: 'Karta nije pronađena' };
      case 'already_used': {
        const checkInTime = data?.checked_in_at
          ? new Date(data.checked_in_at).toLocaleString('sr-BA')
          : 'nepoznato';
        return {
          success: false,
          message: `Karta je već skenirana (${checkInTime})`,
          ticket,
        };
      }
      case 'cancelled':
        return { success: false, message: 'Karta je otkazana', ticket };
      case 'forbidden':
        return { success: false, message: 'Samo administratori mogu skenirati karte' };
      default:
        return { success: false, message: 'Greška pri skeniranju karte' };
    }
  } catch (error) {
    console.error('Error checking in ticket:', error);
    return { success: false, message: 'Greška pri skeniranju karte' };
  }
}

export async function deleteTicket(ticketId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('delete_member_ticket', {
      p_ticket_id: ticketId,
    });

    if (error) {
      console.error('Error calling delete_member_ticket:', error);
      return false;
    }

    if (!data?.success) {
      console.error('Delete failed:', data?.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return false;
  }
}

export async function deleteUsedTickets(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('delete_used_member_tickets');

    if (error) {
      console.error('Error calling delete_used_member_tickets:', error);
      return 0;
    }

    if (!data?.success) {
      console.error('Delete failed:', data?.message);
      return 0;
    }

    return data.count || 0;
  } catch (error) {
    console.error('Error deleting used tickets:', error);
    return 0;
  }
}
