-- Seed Learn Dispatch modules from Alpha Freight Network course outline.
-- Safe to re-run: updates by sort_order title match via upsert on sort_order if unique,
-- otherwise deletes unpublished drafts with same titles then inserts.

insert into public.academy_modules (sort_order, title, summary, content_md, is_published)
values
  (1, 'US map, regions & time zones', 'Know the lanes before you book — regions, states, and time zones dispatchers use every day.', 'Cover USA regional maps, time zones, and state orientation used on the dispatch desk.', true),
  (2, 'Who is a dispatcher', 'The bridge between broker and carrier — role, services, and the freight chain.', 'Load information, rate negotiation, carrier documentation, and broker/shipper/consignee communication.', true),
  (3, 'Equipment we deal with', 'Box truck, hotshot, power only, dry van, reefer, flatbed, and step deck.', 'Capacities, accessories, and typical $/mile ranges for each equipment type.', true),
  (4, 'Drivers, HOS & ELD', 'Solo vs team miles, legal hours, CDL vs non-CDL, ELD and GPS tracking.', 'HOS basics, ELD devices, and location tracking apps used by fleets.', true),
  (5, 'Haul types & driver-friendly loads', 'Local to long haul, round trips, dedicated lanes, and DFL selection.', 'Haul categories plus max rate / min weight / min deadhead for driver-friendly loads.', true),
  (6, 'How carriers get paid', 'Standard DTP, QuickPay, and factoring overview.', 'Payment timing, QuickPay with voided check, and factoring company basics.', true),
  (7, 'Carrier documents & profile', 'MC, W-9, COI, NOA, voided check, and carrier profile.', 'Build a broker-ready document set and copy key fields into the carrier profile.', true),
  (8, 'Special permits & certifications', 'Hazmat, tanker, oversize, TWIC, and TSA.', 'When brokers require special permits and how to verify them.', true),
  (9, 'Broker setup & certificate of holder', 'Carrier packets and COH requests.', 'One-time broker-carrier setup and certificate of holder on the COI.', true),
  (10, 'RC, BOL, POD & accessorials', 'Paperwork from booking through delivery plus TONU/detention/layover.', 'Rate confirmation, BOL, POD, accessorials, scale tickets, and freight guard risk.', true),
  (11, 'Load boards in practice', 'DAT, Sylectus, 123Loadboard, Truckstop, and posting codes.', 'Board workflows and DAT equipment posting constraints.', true),
  (12, 'Comms, VoIP & abbreviations', 'US phone/email tools and trucking abbreviations.', 'VoIP providers plus equipment and paperwork abbreviations used daily.')
on conflict do nothing;
