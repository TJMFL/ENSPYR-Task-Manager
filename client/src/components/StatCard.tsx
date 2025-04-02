import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  className?: string; // Added className prop for custom styling
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBgColor, iconColor, className }) => {
  return (
    <div className={`rounded-lg shadow p-5 ${className}`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 rounded-md p-3 ${iconBgColor}`}>
          <div className={`h-6 w-6 ${iconColor}`}>
            {icon}
          </div>
        </div>
        <div className="ml-5">
          <p className="font-bold text-black text-sm">{title}</p>  {/* Bold and black title */}
          <p className="font-bold text-black text-2xl">{value}</p>  {/* Bold and black value */}
        </div>
      </div>
    </div>
  );
};

export default StatCard;

