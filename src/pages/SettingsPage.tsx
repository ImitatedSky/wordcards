import { TagManager } from '@/features/tags/TagManager'
import { ConstructionBadge } from '@/components/common/ConstructionBadge'

export function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">設定</h1>

      <TagManager />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          匯出全部資料 <ConstructionBadge />
        </h2>
        <p className="text-sm text-slate-500">匯出功能將在後續計畫實作。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          雲端同步 <ConstructionBadge />
        </h2>
        <p className="text-sm text-slate-500">未來版本推出。</p>
      </section>
    </div>
  )
}
