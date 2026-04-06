const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Gunaydin';
  if (hour < 18) return 'Iyi gunler';
  return 'Iyi aksamlar';
};

const formatDate = (): string => {
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
};

export const Greeting = () => {
  const greeting = getGreeting();
  const dateStr = formatDate();

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          {greeting}, Hasan
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          Bugun 3 aksiyon bekliyor · Upcore Demo 48 calisan
        </p>
      </div>
      <p className="text-sm text-[#A3A3A3]">{dateStr}</p>
    </div>
  );
};
