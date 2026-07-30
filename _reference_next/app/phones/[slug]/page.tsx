import { ProductPage, productMetadata } from "../../../components/device/ProductPage";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { return productMetadata((await params).slug, "phone"); }
export default async function PhonePage({ params }: { params: Promise<{ slug: string }> }) { return <ProductPage slug={(await params).slug} expectedCategory="phone" />; }
