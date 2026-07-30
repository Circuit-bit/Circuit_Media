import { ProductPage, productMetadata } from "../../../components/device/ProductPage";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { return productMetadata((await params).slug, "tablet"); }
export default async function TabletPage({ params }: { params: Promise<{ slug: string }> }) { return <ProductPage slug={(await params).slug} expectedCategory="tablet" />; }
