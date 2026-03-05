export interface ChatMessage {
  id: string;
  member_id: string;
  message: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  member?: {
    chat_nickname: string;
    first_name: string;
    last_name: string;
  };
}
