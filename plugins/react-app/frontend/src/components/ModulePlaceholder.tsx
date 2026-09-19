import React from 'react';
import { ShoppingCart, Factory, Warehouse, ArrowLeft, CheckCircle2, Cpu, Database, ExternalLink, Sparkles } from 'lucide-react';
import { ViewType } from '../App';
import { useTranslation } from '../i18n';

interface ModulePlaceholderProps {
  moduleKey: 'orders' | 'manufacturing' | 'inventory';
  onNavigate: (view: ViewType) => void;
}

const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ moduleKey, onNavigate }) => {
  const { translations } = useTranslation();

  const configMap = {
    orders: {
      icon: <ShoppingCart className="text-amber-400" size={32} />,
      title: translations.pages.orders.title,
      subtitle: translations.pages.orders.subtitle,
      description: translations.modulePlaceholder.ordersDescription,
      features: translations.modulePlaceholder.ordersFeatures,
      ofbizEntities: ['OrderHeader', 'OrderItem', 'OrderAdjustment', 'OrderPaymentPreference', 'ReturnHeader'],
      ofbizServices: ['createOrderHeader', 'loadCartForUpdate', 'processOrderPayments', 'createReturnHeader'],
      accentColor: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    },
    manufacturing: {
      icon: <Factory className="text-emerald-400" size={32} />,
      title: translations.pages.manufacturing.title,
      subtitle: translations.pages.manufacturing.subtitle,
      description: translations.modulePlaceholder.manufacturingDescription,
      features: translations.modulePlaceholder.manufacturingFeatures,
      ofbizEntities: ['WorkEffort', 'WorkEffortGoodStandard', 'MrpEvent', 'CostComponent', 'TechDataCalendar'],
      ofbizServices: ['createProductionRun', 'changeProductionRunStatus', 'createMrpEvent', 'calcCostComponent'],
      accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    },
    inventory: {
      icon: <Warehouse className="text-cyan-400" size={32} />,
      title: translations.pages.inventory.title,
      subtitle: translations.pages.inventory.subtitle,
      description: translations.modulePlaceholder.inventoryDescription,
      features: translations.modulePlaceholder.inventoryFeatures,
      ofbizEntities: ['Facility', 'FacilityLocation', 'InventoryItem', 'InventoryItemDetail', 'InventoryItemVariance'],
      ofbizServices: ['createFacility', 'createInventoryTransfer', 'createInventoryItemVariance', 'receiveInventoryProduct'],
      accentColor: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400',
      badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
    },
  };

  const config = configMap[moduleKey];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner Card */}
      <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-br ${config.accentColor} border relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl shrink-0">
              {config.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{config.title}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.badgeBg}`}>
                  <Sparkles size={13} />
                  {translations.modulePlaceholder.statusBadge}
                </span>
              </div>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                {config.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="ds-btn-secondary text-xs sm:text-sm py-2.5 px-4 flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} />
              {translations.modulePlaceholder.backToAccounting}
            </button>
          </div>
        </div>
      </div>

      {/* Description & Planned Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planned Features List */}
        <div className="lg:col-span-2 ds-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400" />
              {translations.modulePlaceholder.featuresTitle}
            </h2>
            <span className="text-xs text-slate-400 font-mono">OFBiz 18.12 Architecture</span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {config.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {config.features.map((feature, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
              >
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-medium text-slate-200">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OFBiz Technical Specs Card */}
        <div className="ds-card p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Cpu size={18} />
              <span>{translations.modulePlaceholder.ofbizIntegration}</span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              {translations.modulePlaceholder.ofbizIntegrationDesc}
            </p>

            {/* Core Entities */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Database size={13} />
                Temel Veri Modelleri (Entities)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {config.ofbizEntities.map(ent => (
                  <span key={ent} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700/60">
                    {ent}
                  </span>
                ))}
              </div>
            </div>

            {/* Core Services */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ExternalLink size={13} />
                Ana Servisler (Services)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {config.ofbizServices.map(srv => (
                  <span key={srv} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 border border-slate-700/60">
                    {srv}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('test-page')}
              className="w-full ds-btn-secondary text-xs py-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>OFBiz API & Tanılama Paneli</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
