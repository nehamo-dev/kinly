interface AvatarProps {
  name: string
  color?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function Avatar({ name, color, size = 'md', className = '' }: AvatarProps) {
  const bg = color || '#1D9E75'
  return (
    <div
      className={`
        rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0
        ${sizeClasses[size]} ${className}
      `}
      style={{ backgroundColor: bg }}
    >
      {initials(name)}
    </div>
  )
}
