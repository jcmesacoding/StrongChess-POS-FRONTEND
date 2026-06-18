<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import debtService from '../services/debtService'

const { t } = useI18n()

const debts = ref([])
const showPayModal = ref(false)
const selectedDebt = ref(null)
const paymentAmount = ref(0)
const errorMessage = ref('')
const successMessage = ref('')
const statusFilter = ref('All')
const search = ref('')

const loadDebts = async () => {
  try {
    debts.value = (await debtService.getAll()).data
  } catch (error) {
    console.error('Error loading debts:', error)
  }
}

const openPayModal = (debt) => {
  selectedDebt.value = debt
  paymentAmount.value = debt.pending
  errorMessage.value = ''
  showPayModal.value = true
}

const submitPayment = async () => {
  errorMessage.value = ''
  try {
    await debtService.pay(selectedDebt.value.id, paymentAmount.value)
    showPayModal.value = false
    await loadDebts()
    showSuccess('Payment registered successfully')
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error processing payment'
  }
}

const showSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => { successMessage.value = '' }, 3000)
}

const filteredDebts = computed(() => {
  return debts.value.filter(debt => {
    // Lee directamente los Strings planos devueltos por tu JSON de la API
    const customerName = debt.customer || '';
    const invoiceNumber = debt.voucher || '';

    const matchesSearch = !search.value ||
      customerName.toLowerCase().includes(search.value.toLowerCase()) ||
      invoiceNumber.toLowerCase().includes(search.value.toLowerCase())

    const matchesStatus = statusFilter.value === 'All' || debt.status === statusFilter.value
    
    return matchesSearch && matchesStatus
  })
})

const totalPending = computed(() =>
  debts.value
    .filter(d => d.status !== 'PAID')
    .reduce((sum, d) => sum + Number(d.pending || 0), 0)
)

const totalDebts = computed(() => debts.value.length)
const pendingCount = computed(() => debts.value.filter(d => d.status === 'PENDING').length)
const partialCount = computed(() => debts.value.filter(d => d.status === 'PARTIAL').length)

const getStatusClass = (status) => {
  if (status === 'PAID') return 'bg-green-100 text-green-700'
  if (status === 'PARTIAL') return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

const formatDate = (date) => {
  if (!date) return '-'
  
  // 1. Si viene en formato YYYY-MM-DD, lo dividimos para evitar problemas de zona horaria
  if (typeof date === 'string' && date.includes('-')) {
    const [year, month, day] = date.split('-')
    // Nota: Los meses en JavaScript van de 0 a 11, por eso restamos 1 al mes
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    })
  }

  // 2. Respaldo estándar por si viene una estructura de fecha completa
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) return '-'
  
  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  })
}


onMounted(() => { loadDebts() })
</script>

<template>
  <div class="space-y-4 lg:space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ $t('debts.title') }}</h1>
        <p class="text-gray-600 text-sm lg:text-base">{{ $t('debts.subtitle') }}</p>
      </div>
    </div>

    <!-- Success toast -->
    <div v-if="successMessage" class="px-5 py-3 rounded-xl bg-green-100 text-green-700 text-sm">
      {{ successMessage }}
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('debts.total_debts') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ totalDebts }}</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('debts.pending') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-red-500">{{ pendingCount }}</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('debts.partial') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-yellow-500">{{ partialCount }}</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('debts.total_pending') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141]">${{ totalPending.toFixed(2) }}</h2>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
      <div class="flex flex-col sm:flex-row gap-3">
        <input v-model="search" type="text" :placeholder="$t('debts.search')"
          class="flex-1 border rounded-lg px-4 py-2 text-sm" />
        <select v-model="statusFilter" class="border rounded-lg px-4 py-2 text-sm">
          <option value="All">{{ $t('debts.all_status') }}</option>
          <option value="PENDING">{{ $t('debts.pending') }}</option>
          <option value="PARTIAL">{{ $t('debts.partial') }}</option>
          <option value="PAID">{{ $t('debts.paid') }}</option>
        </select>
      </div>
    </div>

    <!-- Tabla desktop -->
    <div class="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b" style="background-color:#bef1dd;">
        <h2 class="font-semibold text-[#213141]">{{ $t('debts.list') }}</h2>
      </div>
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left px-6 py-4">{{ $t('debts.customer') }}</th>
            <th class="text-left px-6 py-4">{{ $t('debts.invoice') }}</th>
            <th class="text-left px-6 py-4">{{ $t('debts.total') }}</th>
            <th class="text-left px-6 py-4">{{ $t('debts.paid') }}</th>
            <th class="text-left px-6 py-4">{{ $t('debts.pending') }}</th>
            <th class="text-left px-6 py-4">{{ $t('debts.due_date') }}</th>
            <th class="text-left px-6 py-4">{{ $t('common.status') }}</th>
            <th class="text-left px-6 py-4">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="debt in filteredDebts" :key="debt.id" class="border-b hover:bg-gray-50">
            <td class="px-6 py-4">{{ debt.customer }}</td>
            <td class="px-6 py-4">{{ debt.voucher }}</td>
            <td class="px-6 py-4">${{ Number(debt.total || 0).toFixed(2) }}</td>
            <td class="px-6 py-4 text-green-600">${{ Number(debt.paid || 0).toFixed(2) }}</td>
            <td class="px-6 py-4 text-red-600 font-medium">${{ Number(debt.pending || 0).toFixed(2) }}</td>
            <td class="px-6 py-4">{{ formatDate(debt.dueDate) }}</td>
            <td class="px-6 py-4">
              <span class="px-3 py-1 rounded-full text-sm" :class="getStatusClass(debt.status)">
                {{ debt.status }}
              </span>
            </td>
            <td class="px-6 py-4">
              <button v-if="debt.status !== 'PAID'" @click="openPayModal(debt)"
                class="px-3 py-1 rounded-lg text-white text-sm" style="background-color:#213141">
                {{ $t('debts.pay') }}
              </button>
              <span v-else class="text-gray-400 text-sm">{{ $t('debts.paid_label') }}</span>
            </td>
          </tr>
          <tr v-if="filteredDebts.length === 0">
            <td colspan="8" class="px-6 py-8 text-center text-gray-400">{{ $t('debts.no_debts') }}</td>
          </tr>
        </tbody>

      </table>
    </div>

    <!-- Cards móvil -->
    <div class="lg:hidden space-y-3">
      <div class="px-1 py-2">
        <h2 class="font-semibold text-[#213141]">{{ $t('debts.title') }}</h2>
      </div>
      <div v-for="debt in filteredDebts" :key="debt.id" class="bg-white rounded-xl shadow-sm p-4">
        <div class="flex justify-between items-start mb-3">
          <div>
            <p class="font-semibold text-[#213141]">{{ debt.customer }}</p>
            <p class="text-xs text-gray-500">{{ debt.voucher }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ $t('debts.due_date') }}: {{ formatDate(debt.dueDate) }}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-xs" :class="getStatusClass(debt.status)">
            {{ debt.status }}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-sm mb-3">
          <div class="text-center">
            <p class="text-xs text-gray-400">{{ $t('debts.total') }}</p>
            <p class="font-medium">${{ Number(debt.total || 0).toFixed(2) }}</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-gray-400">{{ $t('debts.paid') }}</p>
            <p class="font-medium text-green-600">${{ Number(debt.paid || 0).toFixed(2) }}</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-gray-400">{{ $t('debts.pending') }}</p>
            <p class="font-medium text-red-600">${{ Number(debt.pending || 0).toFixed(2) }}</p>
          </div>
        </div>
        <!-- Botón pagar móvil -->
        <div v-if="debt.status !== 'PAID'" class="mt-2">
          <button @click="openPayModal(debt)" class="w-full py-2 rounded-lg text-white text-center text-sm"
            style="background-color:#213141">
            {{ $t('debts.pay') }}
          </button>
        </div>
      </div>
    </div>

  </div>

  <!-- Pay Modal -->
  <div v-if="showPayModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl shadow-xl p-5 lg:p-6 w-full max-w-md">

      <div class="flex justify-between items-center mb-5">
        <h2 class="text-xl font-bold text-[#213141]">{{ $t('debts.register_payment') }}</h2>
        <button @click="showPayModal = false" class="text-2xl text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div class="space-y-3 mb-5">
        <div class="bg-gray-50 rounded-xl p-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ $t('debts.customer') }}</span>
            <span class="font-medium">{{ selectedDebt?.customer || '-' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ $t('debts.invoice') }}</span>
            <span class="font-medium">{{ selectedDebt?.voucher || '-' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ $t('debts.total') }}</span>
            <span class="font-medium">${{ Number(selectedDebt?.total).toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ $t('debts.already_paid') }}</span>
            <span class="font-medium text-green-600">${{ Number(selectedDebt?.paid).toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-sm font-bold border-t pt-2 mt-2">
            <span>{{ $t('debts.remaining') }}</span>
            <span class="text-red-600">${{ Number(selectedDebt?.pending).toFixed(2) }}</span>
          </div>
        </div>

        <div>
          <label class="block mb-1 font-medium text-sm">{{ $t('debts.payment_amount') }}</label>
          <input v-model="paymentAmount" type="number" step="0.01" min="0.01" :max="selectedDebt?.pendingAmount"
            class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div v-if="errorMessage" class="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {{ errorMessage }}
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button @click="showPayModal = false" class="px-4 py-2 border rounded-lg text-sm">{{ $t('common.cancel')
        }}</button>
        <button @click="submitPayment" class="px-4 py-2 rounded-lg text-white text-sm" style="background-color:#213141">
          {{ $t('debts.confirm_payment') }}
        </button>
      </div>

    </div>
  </div>
</template>