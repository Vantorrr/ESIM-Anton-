'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { AdminProduct } from '@/lib/types'
import type { TariffFilter } from './useProducts'

export function useProductFilters(products: AdminProduct[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedCountry = searchParams.get('country') || ''
  const activeParam = searchParams.get('active')
  const showActiveOnly = activeParam === 'active' ? true : activeParam === 'inactive' ? false : null
  const typeParam = searchParams.get('type')
  const unlimitedParam = searchParams.get('unlimited')
  const tariffType: TariffFilter =
    typeParam === 'standard' || typeParam === 'unlimited'
      ? typeParam
      : unlimitedParam === 'true'
        ? 'unlimited'
        : unlimitedParam === 'false'
          ? 'standard'
          : 'all'
  const urlSearch = searchParams.get('search') || ''
  const rawPage = Number(searchParams.get('page') || '1')
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const [searchQuery, setSearchQuery] = useState(urlSearch)

  useEffect(() => {
    setSearchQuery(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    const normalized = new URLSearchParams()
    if (selectedCountry) normalized.set('country', selectedCountry)
    if (showActiveOnly === true) normalized.set('active', 'active')
    if (showActiveOnly === false) normalized.set('active', 'inactive')
    if (tariffType !== 'all') normalized.set('type', tariffType)
    if (searchQuery.trim()) normalized.set('search', searchQuery.trim())
    if (page > 1 && searchQuery.trim() === urlSearch) normalized.set('page', String(page))

    if (normalized.toString() === searchParams.toString()) return

    const timeoutId = window.setTimeout(() => {
      const nextQuery = normalized.toString()
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [page, pathname, router, searchParams, searchQuery, selectedCountry, showActiveOnly, tariffType, urlSearch])

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    mutate(nextParams)
    nextParams.delete('unlimited')
    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  const clearFilters = () => {
    setSearchQuery('')
    router.replace(pathname)
  }

  return {
    page,
    appliedSearchQuery: urlSearch,
    selectedCountry,
    showActiveOnly,
    tariffType,
    searchQuery,
    filteredProducts: products,
    setSelectedCountry: (value: string) => replaceParams((params) => {
      if (value) params.set('country', value)
      else params.delete('country')
      params.delete('page')
    }),
    setShowActiveOnly: (value: boolean | null) => replaceParams((params) => {
      if (value === true) params.set('active', 'active')
      else if (value === false) params.set('active', 'inactive')
      else params.delete('active')
      params.delete('page')
    }),
    setTariffType: (value: TariffFilter) => replaceParams((params) => {
      if (value === 'all') params.delete('type')
      else params.set('type', value)
      params.delete('page')
    }),
    setPage: (value: number) => replaceParams((params) => {
      if (value > 1) params.set('page', String(value))
      else params.delete('page')
    }),
    setSearchQuery,
    clearFilters,
  }
}
