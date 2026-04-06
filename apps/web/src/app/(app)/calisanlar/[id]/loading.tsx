export default function EmployeeDetailLoading() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="flex flex-col gap-0">
      {/* Header skeleton */}
      <div
        style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 24, marginBottom: 24 }}
        className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-4">
          {/* Back button placeholder */}
          <div
            style={{ width: 20, height: 20, borderRadius: 4, background: '#f0f0f0' }}
            className="mt-2 shrink-0 animate-pulse"
          />
          {/* Avatar skeleton */}
          <div
            style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0f0f0' }}
            className="shrink-0 animate-pulse"
          />
          {/* Name + meta skeleton */}
          <div className="flex flex-col gap-2">
            <div
              style={{ width: 200, height: 28, borderRadius: 6, background: '#f0f0f0' }}
              className="animate-pulse"
            />
            <div
              style={{ width: 280, height: 16, borderRadius: 4, background: '#f0f0f0' }}
              className="animate-pulse"
            />
          </div>
        </div>
        {/* Buttons skeleton */}
        <div className="flex items-center gap-2">
          <div
            style={{ width: 100, height: 36, borderRadius: 8, background: '#f0f0f0' }}
            className="animate-pulse"
          />
          <div
            style={{ width: 140, height: 36, borderRadius: 8, background: '#f0f0f0' }}
            className="animate-pulse"
          />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div
        style={{ borderBottom: '1px solid #f0f0f0', marginBottom: 24 }}
        className="flex gap-0"
      >
        {[80, 60, 72, 64].map((w, i) => (
          <div
            key={i}
            style={{ width: w, height: 16, borderRadius: 4, background: '#f0f0f0', margin: '10px 20px' }}
            className="animate-pulse"
          />
        ))}
      </div>

      {/* Content skeleton: two cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div
          style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}
        >
          <div
            style={{ width: 140, height: 18, borderRadius: 4, background: '#f0f0f0', marginBottom: 20 }}
            className="animate-pulse"
          />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="mb-4 flex justify-between">
              <div
                style={{ width: 80, height: 14, borderRadius: 4, background: '#f0f0f0' }}
                className="animate-pulse"
              />
              <div
                style={{ width: 120, height: 14, borderRadius: 4, background: '#f0f0f0' }}
                className="animate-pulse"
              />
            </div>
          ))}
        </div>
        <div
          style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}
        >
          <div
            style={{ width: 120, height: 18, borderRadius: 4, background: '#f0f0f0', marginBottom: 20 }}
            className="animate-pulse"
          />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="mb-4 flex justify-between">
              <div
                style={{ width: 100, height: 14, borderRadius: 4, background: '#f0f0f0' }}
                className="animate-pulse"
              />
              <div
                style={{ width: 100, height: 14, borderRadius: 4, background: '#f0f0f0' }}
                className="animate-pulse"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
