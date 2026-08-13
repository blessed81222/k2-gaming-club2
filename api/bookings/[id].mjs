import { deleteBooking } from '../../server/bookings.mjs';

export default async function handler(req, res) {
  try {
    if (req.method !== 'DELETE') {
      res.setHeader('Allow', 'DELETE');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const id = req.query?.id;
    if (!id) {
      return res.status(400).json({ ok: false, error: 'Booking id is required' });
    }

    await deleteBooking(String(id));
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Booking delete error:', error);
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
