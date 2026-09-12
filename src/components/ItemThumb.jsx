export default function ItemThumb({ imageUrl, label, size = 'md' }) {
  const dimension = size === 'lg' ? 'h-28 w-28' : size === 'sm' ? 'h-14 w-14' : 'h-20 w-20'

  if (!imageUrl) {
    return (
      <div
        className={`flex ${dimension} shrink-0 items-center justify-center rounded-xl border border-dashed border-mist bg-sand text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-slate`}
      >
        No photo
      </div>
    )
  }

  return (
    <div className={`${dimension} shrink-0 overflow-hidden rounded-xl border border-mist`}>
      <img
        src={imageUrl}
        alt={label}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-110"
      />
    </div>
  )
}
