export interface Ticket {
  id: string;
  order_id: number;
  product_id: number;
  ticket_code: string;
  ticket_type: string;
  customer_email: string;
  customer_name: string;
  member_id?: string;
  event_name: string;
  event_date?: string;
  status: 'active' | 'used' | 'cancelled';
  is_season_ticket: boolean;
  check_in_time?: string;
  check_in_by?: string;
  created_at: string;
  updated_at: string;
}
