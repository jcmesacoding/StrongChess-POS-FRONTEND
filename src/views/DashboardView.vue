<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import dashboardService from "../services/dashboardService";
import { Bar, Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const { t } = useI18n();

const formatDate = (date) => {
  if (!date) return '-'

  // Si viene en formato YYYY-MM-DD o con hora, lo dividimos limpiamente
  if (typeof date === 'string' && date.includes('-')) {
    const cleanDate = date.split('T')[0] 
    const [year, month, day] = cleanDate.split('-')
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) return '-'

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const dashboardData = ref({
  totalProducts: 0,
  totalCustomers: 0,
  totalSales: 0,
  inventoryValue: 0,
  topProducts: [],
  recentSales: [],
  lowStockProducts: []
});

const salesByDayChart = ref({ labels: [], datasets: [] });
const salesByMonthChart = ref({ labels: [], datasets: [] });
const topProductsChart = ref({ labels: [], datasets: [] });

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }
};

const loadDashboardData = async () => {
  try {
    dashboardData.value = (await dashboardService.getAll()).data;
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
};

const loadCharts = async () => {
  try {
    const [dayRes, monthRes, topRes] = await Promise.all([
      dashboardService.getSalesByDay(),
      dashboardService.getSalesByMonth(),
      dashboardService.getTopProducts()
    ]);

    salesByDayChart.value = {
      labels: dayRes.data.map(d => d.day),
      datasets: [{ label: t('dashboard.sales_last_7_days'), data: dayRes.data.map(d => d.total), backgroundColor: '#2D4A5A', borderRadius: 6 }]
    };

    salesByMonthChart.value = {
      labels: monthRes.data.map(d => d.month),
      datasets: [{ label: t('dashboard.revenue_this_year'), data: monthRes.data.map(d => d.total), borderColor: '#213141', backgroundColor: '#bef1dd', tension: 0.4, fill: true }]
    };

    topProductsChart.value = {
      labels: topRes.data.map(d => d.name),
      datasets: [{ label: t('dashboard.top_products'), data: topRes.data.map(d => d.totalSold), backgroundColor: ['#2D4A5A', '#3d6b82', '#4e8ca9', '#bef1dd', '#91e0c0'], borderRadius: 6 }]
    };

  } catch (error) {
    console.error("Error loading charts:", error);
  }
};

onMounted(async () => {
  await loadDashboardData();
  await loadCharts();
});
</script>

<template>
  <div class="space-y-4 lg:space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ $t('dashboard.title') }}</h1>
      <p class="text-gray-600 text-sm lg:text-base">{{ $t('dashboard.subtitle') }}</p>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('dashboard.inventory_value') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-green-600 mt-1 lg:mt-2">
          ${{ dashboardData.inventoryValue?.toFixed(2) ?? '0.00' }}
        </h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('dashboard.total_sales') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141] mt-1 lg:mt-2">
          {{ dashboardData.totalSales }}
        </h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('dashboard.products') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141] mt-1 lg:mt-2">
          {{ dashboardData.totalProducts }}
        </h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('dashboard.customers') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141] mt-1 lg:mt-2">
          {{ dashboardData.totalCustomers }}
        </h2>
      </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-6">
        <h2 class="font-semibold text-[#213141] mb-4">{{ $t('dashboard.sales_last_7_days') }}</h2>
        <div class="h-48 lg:h-64">
          <Bar v-if="salesByDayChart.labels.length > 0" :data="salesByDayChart" :options="chartOptions" />
          <div v-else class="h-full flex items-center justify-center text-gray-400 text-sm">
            {{ $t('dashboard.no_data') }}
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-6">
        <h2 class="font-semibold text-[#213141] mb-4">{{ $t('dashboard.revenue_this_year') }}</h2>
        <div class="h-48 lg:h-64">
          <Line v-if="salesByMonthChart.labels.length > 0" :data="salesByMonthChart" :options="chartOptions" />
          <div v-else class="h-full flex items-center justify-center text-gray-400 text-sm">
            {{ $t('dashboard.no_data') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row 2 + Low Stock -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      <div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-4 lg:p-6">
        <h2 class="font-semibold text-[#213141] mb-4">{{ $t('dashboard.top_products') }}</h2>
        <div class="h-48 lg:h-64">
          <Bar v-if="topProductsChart.labels.length > 0" :data="topProductsChart" :options="chartOptions" />
          <div v-else class="h-full flex items-center justify-center text-gray-400 text-sm">
            {{ $t('dashboard.no_data') }}
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-6">
        <h2 class="font-semibold text-[#213141] mb-4">{{ $t('dashboard.low_stock_alert') }}</h2>
        <div v-if="dashboardData.lowStockProducts && dashboardData.lowStockProducts.length > 0" class="space-y-3">
          <div v-for="product in dashboardData.lowStockProducts" :key="product.productId"
            class="flex justify-between text-sm lg:text-base border-b border-gray-50 pb-2 last:border-none last:pb-0">
            <span class="text-gray-700 font-medium">{{ product.productName }}</span>
            <span class="font-bold px-2 py-0.5 rounded-md text-xs lg:text-sm"
              :class="product.currentStock === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'">
              {{ product.currentStock }} {{ $t('inventory.units_in_stock') }}
            </span>
          </div>
        </div>
        <div v-else class="text-center py-6 text-gray-400 text-sm">
          {{ $t('dashboard.all_stocked') }}
        </div>
      </div>
    </div>

    <!-- Recent Sales -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b" style="background-color:#bef1dd;">
        <h2 class="font-semibold text-[#213141]">{{ $t('dashboard.recent_sales') }}</h2>
      </div>
      <table class="hidden lg:table w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left px-6 py-4">{{ $t('dashboard.invoice') }}</th>
            <th class="text-left px-6 py-4">{{ $t('dashboard.customer') }}</th>
            <th class="text-left px-6 py-4">{{ $t('dashboard.amount') }}</th>
            <th class="text-left px-6 py-4">{{ $t('dashboard.date') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sale in dashboardData.recentSales" :key="sale.id" class="border-b hover:bg-gray-50">
            <td class="px-6 py-4">{{ sale.voucherSerie }}-{{ sale.voucherNumber }}</td>
            <td class="px-6 py-4">{{ sale.customer }}</td>
            <td class="px-6 py-4">${{ Number(sale.total || 0).toFixed(2) }}</td>
            <td class="px-6 py-4">{{ formatDate(sale.saleDate) }}</td>
          </tr>
          <tr v-if="!dashboardData.recentSales || dashboardData.recentSales.length === 0">
            <td colspan="4" class="px-6 py-8 text-center text-gray-400">{{ $t('dashboard.no_sales') }}</td>
          </tr>
        </tbody>
      </table>

      <div class="lg:hidden divide-y">
        <div v-for="sale in dashboardData.recentSales" :key="sale.id" class="p-4 flex justify-between items-center">
          <div>
            <!-- Acceso directo al String plano mapeado del cliente -->
            <p class="font-medium text-[#213141]">{{ sale.customer }}</p>
            <p class="text-xs text-gray-500">{{ sale.voucherSerie }}-{{ sale.voucherNumber }}</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-[#213141]">${{ Number(sale.total || 0).toFixed(2) }}</p>
            <p class="text-xs text-gray-400">{{ formatDate(sale.saleDate) }}</p>
          </div>
        </div>
        <div v-if="!dashboardData.recentSales || dashboardData.recentSales.length === 0"
          class="p-6 text-center text-gray-400 text-sm">
          {{ $t('dashboard.no_sales') }}
        </div>
      </div>
    </div>
  </div>
</template>