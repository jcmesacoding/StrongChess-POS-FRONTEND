<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from 'vue-i18n'
import salesService from "../services/salesService";
import cashWithdrawalService from "../services/cashWithdrawalService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const { t } = useI18n();

const sales = ref([]);
const startDate = ref("");
const endDate = ref("");

const cashBalance = ref({ totalSales: 0, totalWithdrawals: 0, cashInRegister: 0 });
const withdrawals = ref([]);
const showWithdrawModal = ref(false);
const withdrawAmount = ref(0);
const withdrawReason = ref("");
const withdrawError = ref("");

const loadCashData = async () => {
  try {
    cashBalance.value = (await cashWithdrawalService.getBalance()).data;
    withdrawals.value = (await cashWithdrawalService.getAll()).data;
  } catch (error) {
    console.error(error);
  }
};

const openWithdrawModal = () => {
  withdrawAmount.value = 0;
  withdrawReason.value = "";
  withdrawError.value = "";
  showWithdrawModal.value = true;
};

const submitWithdraw = async () => {
  withdrawError.value = "";
  try {
    await cashWithdrawalService.create(withdrawAmount.value, withdrawReason.value);
    showWithdrawModal.value = false;
    await loadCashData();
  } catch (error) {
    withdrawError.value = error.response?.data?.message || "Error registering withdrawal";
  }
};

const loadSales = async () => {
  try {
    sales.value = (await salesService.getAll()).data;
  } catch (error) {
    console.error(error);
  }
};

const filteredSales = computed(() => {
  return sales.value.filter(sale => {
    if (!startDate.value && !endDate.value) return true;
    const date = sale.saleDate.split("T")[0];
    return (!startDate.value || date >= startDate.value) &&
            (!endDate.value || date <= endDate.value);
  });
});

const totalRevenue = computed(() =>
  filteredSales.value.reduce((total, sale) => total + sale.total, 0)
);

const averageSale = computed(() =>
  filteredSales.value.length === 0 ? 0 : totalRevenue.value / filteredSales.value.length
);

const getDateRange = () => {
  if (startDate.value && endDate.value) return `${startDate.value} to ${endDate.value}`
  if (startDate.value) return `From ${startDate.value}`
  if (endDate.value) return `Until ${endDate.value}`
  return 'All time'
}

const exportPDF = () => {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(33, 49, 65)
  doc.text('StrongChess POS - Sales Report', 14, 20)

  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Period: ${getDateRange()}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 37)

  doc.setFontSize(12)
  doc.setTextColor(33, 49, 65)
  doc.text(`Total Revenue: $${totalRevenue.value.toFixed(2)}`, 14, 48)
  doc.text(`Total Sales: ${filteredSales.value.length}`, 14, 55)
  doc.text(`Average Sale: $${averageSale.value.toFixed(2)}`, 14, 62)

  autoTable(doc, {
    startY: 72,
    head: [['Invoice', 'Customer', 'Employee', 'Total', 'Date']],
    body: filteredSales.value.map(sale => [
      `${sale.voucherSerie}-${sale.voucherNumber}`,
      sale.customerName,
      sale.employeeName,
      `$${Number(sale.total).toFixed(2)}`,
      sale.saleDate.split('T')[0]
    ]),
    headStyles: {
      fillColor: [45, 74, 90],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [190, 241, 221]
    },
    styles: { fontSize: 10 }
  })

  doc.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

const exportExcel = () => {
  const data = filteredSales.value.map(sale => ({
    Invoice: `${sale.voucherSerie}-${sale.voucherNumber}`,
    Customer: sale.customerName,
    Employee: sale.employeeName,
    Total: Number(sale.total).toFixed(2),
    Date: sale.saleDate.split('T')[0]
  }))

  const summary = [
    { Invoice: 'SUMMARY', Customer: '', Employee: '', Total: '', Date: '' },
    { Invoice: 'Total Revenue', Customer: `$${totalRevenue.value.toFixed(2)}`, Employee: '', Total: '', Date: '' },
    { Invoice: 'Total Sales', Customer: filteredSales.value.length, Employee: '', Total: '', Date: '' },
    { Invoice: 'Average Sale', Customer: `$${averageSale.value.toFixed(2)}`, Employee: '', Total: '', Date: '' },
    { Invoice: '', Customer: '', Employee: '', Total: '', Date: '' },
    { Invoice: 'DETAIL', Customer: '', Employee: '', Total: '', Date: '' },
  ]

  const ws = XLSX.utils.json_to_sheet([...summary, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Report')
  XLSX.writeFile(wb, `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`)
}

onMounted(() => {
  loadSales();
  loadCashData();
});
</script>

<template>
  <div class="space-y-4 lg:space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ $t('reports.title') }}</h1>
        <p class="text-gray-600 text-sm lg:text-base">{{ $t('reports.subtitle') }}</p>
      </div>
      <!-- Export buttons -->
      <div class="flex gap-2">
        <button @click="exportPDF"
          class="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
          style="background-color:#dc2626">
          📄 PDF
        </button>
        <button @click="exportExcel"
          class="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
          style="background-color:#16a34a">
          📊 Excel
        </button>
      </div>
    </div>

    <!-- Date filters -->
    <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <label class="block text-sm text-gray-500 mb-1">{{ $t('reports.start_date') }}</label>
          <input v-model="startDate" type="date" class="w-full border rounded-xl px-4 py-2 text-sm" />
        </div>
        <div class="flex-1">
          <label class="block text-sm text-gray-500 mb-1">{{ $t('reports.end_date') }}</label>
          <input v-model="endDate" type="date" class="w-full border rounded-xl px-4 py-2 text-sm" />
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-5">
      <div class="bg-white p-4 lg:p-5 rounded-xl shadow-sm flex sm:block justify-between items-center">
        <p class="text-gray-500 text-sm">{{ $t('reports.revenue') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141]">${{ totalRevenue.toFixed(2) }}</h2>
      </div>
      <div class="bg-white p-4 lg:p-5 rounded-xl shadow-sm flex sm:block justify-between items-center">
        <p class="text-gray-500 text-sm">{{ $t('reports.sales') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ filteredSales.length }}</h2>
      </div>
      <div class="bg-white p-4 lg:p-5 rounded-xl shadow-sm flex sm:block justify-between items-center">
        <p class="text-gray-500 text-sm">{{ $t('reports.average') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141]">${{ averageSale.toFixed(2) }}</h2>
      </div>
    </div>

    <!-- Efectivo en caja -->
    <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p class="text-gray-500 text-sm">{{ $t('reports.cash_in_register') }}</p>
          <h2 class="text-2xl lg:text-3xl font-bold text-[#213141]">${{ Number(cashBalance.cashInRegister).toFixed(2) }}</h2>
          <p class="text-xs text-gray-400 mt-1">{{ $t('reports.total_withdrawals') }}: ${{ Number(cashBalance.totalWithdrawals).toFixed(2) }}</p>
        </div>
        <button @click="openWithdrawModal"
          class="px-4 py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
          style="background-color:#213141">
          {{ $t('reports.withdraw_cash') }}
        </button>
      </div>

      <div v-if="withdrawals.length" class="mt-4 border-t pt-3">
        <p class="text-sm font-semibold text-[#213141] mb-2">{{ $t('reports.withdrawal_history') }}</p>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          <div v-for="w in withdrawals" :key="w.id" class="flex justify-between text-sm">
            <span class="text-gray-500">
              {{ new Date(w.withdrawalDate).toLocaleString() }}
              <span v-if="w.reason"> · {{ w.reason }}</span>
              · {{ $t('reports.withdrawn_by') }}: {{ w.performedBy }}
            </span>
            <span class="font-medium text-red-600">-${{ Number(w.amount).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla desktop -->
    <div class="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b" style="background-color:#bef1dd;">
        <h2 class="font-semibold text-[#213141]">{{ $t('reports.detail') }}</h2>
      </div>
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left p-4">{{ $t('reports.invoice') }}</th>
            <th class="text-left p-4">{{ $t('reports.customer') }}</th>
            <th class="text-left p-4">{{ $t('reports.employee') }}</th>
            <th class="text-left p-4">{{ $t('reports.total') }}</th>
            <th class="text-left p-4">{{ $t('reports.date') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sale in filteredSales" :key="sale.id" class="border-b hover:bg-gray-50">
            <td class="p-4">{{ sale.voucherSerie }}-{{ sale.voucherNumber }}</td>
            <td class="p-4">{{ sale.customerName }}</td>
            <td class="p-4">{{ sale.employeeName }}</td>
            <td class="p-4">${{ Number(sale.total).toFixed(2) }}</td>
            <td class="p-4">{{ sale.saleDate.split('T')[0] }}</td>
          </tr>
          <tr v-if="filteredSales.length === 0">
            <td colspan="5" class="p-6 text-center text-gray-400">{{ $t('reports.no_sales') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cards móvil -->
    <div class="lg:hidden space-y-3">
      <div class="px-1 py-2">
        <h2 class="font-semibold text-[#213141]">{{ $t('reports.detail') }}</h2>
      </div>
      <div v-for="sale in filteredSales" :key="sale.id"
        class="bg-white rounded-xl shadow-sm p-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="font-semibold text-[#213141]">{{ sale.customerName }}</p>
            <p class="text-xs text-gray-500">{{ sale.voucherSerie }}-{{ sale.voucherNumber }}</p>
          </div>
          <p class="font-bold text-[#213141]">${{ Number(sale.total).toFixed(2) }}</p>
        </div>
        <div class="flex justify-between text-sm text-gray-500">
          <span>{{ sale.employeeName }}</span>
          <span>{{ sale.saleDate.split('T')[0] }}</span>
        </div>
      </div>
      <div v-if="filteredSales.length === 0" class="text-center py-6 text-gray-500 text-sm">
        {{ $t('reports.no_sales') }}
      </div>
    </div>

  </div>

  <!-- Withdraw Cash Modal -->
  <div v-if="showWithdrawModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl shadow-xl p-5 lg:p-6 w-full max-w-md">

      <div class="flex justify-between items-center mb-5">
        <h2 class="text-xl font-bold text-[#213141]">{{ $t('reports.withdraw_title') }}</h2>
        <button @click="showWithdrawModal = false" class="text-2xl text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div class="space-y-3 mb-5">
        <div class="bg-gray-50 rounded-xl p-4 flex justify-between text-sm">
          <span class="text-gray-500">{{ $t('reports.cash_in_register') }}</span>
          <span class="font-bold text-[#213141]">${{ Number(cashBalance.cashInRegister).toFixed(2) }}</span>
        </div>

        <div>
          <label class="block mb-1 font-medium text-sm">{{ $t('reports.withdraw_amount') }}</label>
          <input v-model="withdrawAmount" type="number" step="0.01" min="0.01" :max="cashBalance.cashInRegister"
            class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label class="block mb-1 font-medium text-sm">{{ $t('reports.withdraw_reason') }}</label>
          <input v-model="withdrawReason" type="text" :placeholder="$t('reports.withdraw_reason_placeholder')"
            class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div v-if="withdrawError" class="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {{ withdrawError }}
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button @click="showWithdrawModal = false" class="px-4 py-2 border rounded-lg text-sm">{{ $t('common.cancel') }}</button>
        <button @click="submitWithdraw" class="px-4 py-2 rounded-lg text-white text-sm" style="background-color:#213141">
          {{ $t('reports.withdraw_confirm') }}
        </button>
      </div>

    </div>
  </div>
</template>