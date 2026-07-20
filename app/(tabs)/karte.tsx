import TicketListScreen from '@/components/TicketListScreen';
import { Ticket as TicketIcon } from '@/components/Icons';

export default function KarteScreen() {
  return (
    <TicketListScreen
      kind="match"
      title="Moje Karte"
      emptySubtitle="Karte kupljene na webu će se automatski pojaviti ovdje"
      HeaderIcon={TicketIcon}
    />
  );
}
