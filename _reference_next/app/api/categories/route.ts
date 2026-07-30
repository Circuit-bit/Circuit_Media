import { categories, devices } from "../../../lib/seed/catalog";
export async function GET() { return Response.json({ data: categories.map((category) => ({ ...category, count: devices.filter((device) => device.category === category.key).length })) }); }
