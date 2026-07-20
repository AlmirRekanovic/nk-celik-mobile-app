import TicketListScreen from '@/components/TicketListScreen';
import { Star } from '@/components/Icons';

export default function SezonskeScreen() {
  return (
    <TicketListScreen
      kind="season"
      title="Sezonske Karte"
      emptySubtitle="Sezonske karte kupljene na webu će se automatski pojaviti ovdje"
      HeaderIcon={Star}
    />
  );
}
