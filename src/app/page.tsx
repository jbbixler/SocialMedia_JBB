import { clients, about } from '@/lib/data'
import Portfolio from '@/components/Portfolio'

export default function Page() {
  return <Portfolio clients={clients} about={about} />
}
