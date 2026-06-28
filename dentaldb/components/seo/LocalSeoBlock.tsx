/**
 * components/seo/LocalSeoBlock.tsx
 * Renders: Google Maps embed, NAP (Name/Address/Phone), appointment CTA,
 * opening hours, and review stars — all wrapped with microdata attributes
 * for extra structured-data signal.
 */

interface OpeningHoursSlot {
  start: string;
  end:   string;
}

interface LocalSeoBlockProps {
  clinicName:    string;
  address?:      string | null;
  city?:         string | null;
  phone?:        string | null;
  email?:        string | null;
  latitude?:     number | null;
  longitude?:    number | null;
  workingHours?: Record<string, OpeningHoursSlot | null> | null;
  ratingValue?:  number | null;
  reviewCount?:  number | null;
  appointmentUrl?: string;
  className?:    string;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export function LocalSeoBlock({
  clinicName,
  address,
  city,
  phone,
  email,
  latitude,
  longitude,
  workingHours,
  ratingValue,
  reviewCount,
  appointmentUrl,
  className = '',
}: LocalSeoBlockProps) {
  const hasLocation  = !!(latitude && longitude);
  const hasHours     = !!(workingHours && Object.keys(workingHours).length > 0);
  const hasRating    = !!(ratingValue && reviewCount);
  const mapsEmbedUrl = hasLocation
    ? `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`
    : null;
  const mapsLink = hasLocation
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null;

  return (
    <div
      className={`rounded-2xl border border-gray-100 overflow-hidden bg-white ${className}`}
      itemScope
      itemType="https://schema.org/MedicalClinic"
    >
      {/* ── Google Maps embed ── */}
      {mapsEmbedUrl && (
        <div className="aspect-video w-full">
          <iframe
            title={`${clinicName} on Google Maps`}
            src={mapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* ── Clinic name (hidden from UI — for schema microdata) ── */}
        <span itemProp="name" className="sr-only">{clinicName}</span>

        {/* ── Rating stars ── */}
        {hasRating && (
          <div
            className="flex items-center gap-2"
            itemProp="aggregateRating"
            itemScope
            itemType="https://schema.org/AggregateRating"
          >
            <div className="flex text-yellow-400 text-lg" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i}>{i < Math.round(ratingValue!) ? '★' : '☆'}</span>
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-800">
              <span itemProp="ratingValue">{ratingValue}</span>
            </span>
            <span className="text-sm text-gray-500">
              (<span itemProp="reviewCount">{reviewCount}</span> reviews)
            </span>
          </div>
        )}

        {/* ── NAP ── */}
        <div
          className="space-y-2 text-sm text-gray-700"
          itemProp="address"
          itemScope
          itemType="https://schema.org/PostalAddress"
        >
          {(address || city) && (
            <div className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5" aria-hidden="true">📍</span>
              <div>
                {address && (
                  <span itemProp="streetAddress" className="block">{address}</span>
                )}
                {city && (
                  <span itemProp="addressLocality" className="block text-gray-500">{city}</span>
                )}
                {mapsLink && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs mt-0.5 inline-block"
                  >
                    Get directions →
                  </a>
                )}
              </div>
            </div>
          )}

          {phone && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400" aria-hidden="true">📞</span>
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                itemProp="telephone"
                className="hover:text-blue-600 hover:underline font-medium"
              >
                {phone}
              </a>
            </div>
          )}

          {email && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400" aria-hidden="true">✉️</span>
              <a
                href={`mailto:${email}`}
                itemProp="email"
                className="hover:text-blue-600 hover:underline"
              >
                {email}
              </a>
            </div>
          )}
        </div>

        {/* ── Opening hours ── */}
        {hasHours && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Opening Hours
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {Object.entries(workingHours!).map(([day, slot]) => (
                <div key={day} className="contents">
                  <dt className="text-gray-500 capitalize">{DAY_LABELS[day] ?? day}</dt>
                  <dd className="text-gray-900 font-medium tabular-nums">
                    {slot ? `${slot.start} – ${slot.end}` : 'Closed'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* ── Appointment CTA ── */}
        {appointmentUrl && (
          <a
            href={appointmentUrl}
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            itemProp="url"
          >
            Book Appointment
          </a>
        )}
      </div>
    </div>
  );
}
