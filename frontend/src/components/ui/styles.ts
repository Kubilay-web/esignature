export const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition ' +
  'placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ' +
  'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'

export const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'

/** All attributes except class (class goes on the wrapper label). */
export const withoutClass = (attrs: Record<string, unknown>) => {
  const { class: _class, ...rest } = attrs
  return rest
}
