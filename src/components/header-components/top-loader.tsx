'use client'
import insightZustand from '@/utils/insight-zustand'
import React from 'react'

const TopLoader = () => {
    const { topLoader } = insightZustand()
    return (
        <div className="absolute bottom-0 inset-x-0">
            {topLoader && <div className="loader"/>}
        </div>
    )
}

export default TopLoader
