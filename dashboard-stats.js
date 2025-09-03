// Dashboard statistics and analytics functionality

export function calculateMemberStats(members) {
    const stats = {
        totalMembers: members.length,
        totalLeaveTypes: 0,
        averageBalance: 0,
        lowBalanceCount: 0,
        totalDaysGranted: 0,
        totalDaysUsed: 0
    };

    let totalBalance = 0;
    let totalGrant = 0;

    members.forEach(member => {
        const leaves = member.leaves || [];
        stats.totalLeaveTypes += leaves.length;

        leaves.forEach(leave => {
            const grant = leave.annualGrant || 0;
            const balance = leave.balanceThisYear || 0;
            const used = grant - balance;

            stats.totalDaysGranted += grant;
            stats.totalDaysUsed += used;
            totalBalance += balance;
            totalGrant += grant;

            // Count low balance (less than 25% remaining)
            if (grant > 0 && (balance / grant) < 0.25) {
                stats.lowBalanceCount++;
            }
        });
    });

    stats.averageBalance = totalGrant > 0 ? (totalBalance / totalGrant) * 100 : 0;

    return stats;
}

export function renderDashboardStats(members) {
    const stats = calculateMemberStats(members);
    const statsContainer = document.getElementById('dashboard-stats');
    
    if (!statsContainer) return;

    statsContainer.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Total Members</p>
                        <p class="text-2xl font-bold text-gray-900">${stats.totalMembers}</p>
                    </div>
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Leave Types</p>
                        <p class="text-2xl font-bold text-gray-900">${stats.totalLeaveTypes}</p>
                    </div>
                    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Avg. Balance</p>
                        <p class="text-2xl font-bold text-gray-900">${stats.averageBalance.toFixed(1)}%</p>
                    </div>
                    <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Low Balance</p>
                        <p class="text-2xl font-bold text-gray-900">${stats.lowBalanceCount}</p>
                    </div>
                    <div class="w-12 h-12 ${stats.lowBalanceCount > 0 ? 'bg-red-100' : 'bg-gray-100'} rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 ${stats.lowBalanceCount > 0 ? 'text-red-600' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    `;
}