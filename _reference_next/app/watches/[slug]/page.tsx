import { ProductPage, productMetadata } from "../../../components/device/ProductPage";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { return productMetadata((await params).slug, "watch"); }
export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) { return <ProductPage slug={(await params).slug} expectedCategory="watch" />; }
