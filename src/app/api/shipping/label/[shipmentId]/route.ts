import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guards';
import { ShipmentModel } from '@/lib/models';
import { shiprocketClient } from '@/modules/shipping/providers/shiprocket/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { shipmentId: string } }
) {
  try {
    await requireAdmin();
    const shipment = await ShipmentModel.findById(params.shipmentId);

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    let labelUrl = (shipment as any).labelUrl;

    if (!labelUrl) {
      const srShipmentId = (shipment as any).srShipmentId || 12345;
      const res = await shiprocketClient.generateLabel(srShipmentId);
      labelUrl = res.label_url;
      await ShipmentModel.updateOne({ _id: shipment.id }, { $set: { labelUrl } });
    }

    return NextResponse.json({ success: true, labelUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
