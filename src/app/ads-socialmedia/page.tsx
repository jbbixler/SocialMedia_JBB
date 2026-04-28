import { clients, about } from '@/lib/data'
import Portfolio from '@/components/Portfolio'

export default function AdsPortfolioPage() {
  return <Portfolio clients={clients} about={about} />
}
