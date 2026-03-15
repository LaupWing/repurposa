export function TabButton({
    active,
    onClick,
    icon: Icon,
    label,
    badge,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    badge?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                active
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
        >
            <Icon size={16} />
            {label}
            {badge && (
                <span className="absolute -top-2 -right-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    {badge}
                </span>
            )}
        </button>
    );
}
