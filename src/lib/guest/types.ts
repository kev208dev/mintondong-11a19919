export type GuestOffer = {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  venueName: string;
  address: string;
  startsAt: string;
  endsAt: string;
  bookingClosesAt: string;
  capacity: number;
  remainingCapacity: number;
  pricePerPerson: number;
  skillNote: string | null;
  instructions: string | null;
  parkingAvailable: boolean;
  showerAvailable: boolean;
  shuttlecockIncluded: boolean;
  cancellationPolicy: string | null;
  status: string;
};

export type GuestBooking = {
  id: string;
  offerId: string;
  userId: string;
  partySize: number;
  unitPrice: number;
  subtotalAmount: number;
  platformFeeAmount: number;
  totalAmount: number;
  providerPayoutAmount: number;
  paymentId: string | null;
  status: string;
  createdAt: string;
  offerTitle?: string;
  startsAt?: string;
  venueName?: string;
};
