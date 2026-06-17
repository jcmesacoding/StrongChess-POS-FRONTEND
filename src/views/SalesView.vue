<script setup>
import { ref, onMounted, computed } from "vue";
import { useI18n } from 'vue-i18n'
import productService from "../services/productService";
import salesService from "../services/salesService";
import customerService from "../services/customerService";
import employeeService from "../services/employeeService";
import voucherTypeService from "../services/voucherTypeService";
import ToastNotification from "../components/ToastNotification.vue";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const { t } = useI18n()

const products = ref([]);
const customers = ref([]);
const employees = ref([]);
const voucherTypes = ref([]);
const employeeId = ref("");
const customerId = ref("");
const voucherTypeId = ref("");
const cart = ref([]);
const sales = ref([]);
const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref("success");
const search = ref("");
const showCart = ref(false);
const showPartialModal = ref(false);
const partialAmount = ref(0);
const showInvoiceModal = ref(false);
const currentInvoice = ref(null);

const total = computed(() =>
  cart.value.reduce((sum, item) => sum + (item.salePrice * item.units) - item.discount, 0)
);

const formattedTotal = computed(() => total.value.toFixed(2));

const filteredProducts = computed(() => {
  if (!search.value) return products.value;
  const text = search.value.toLowerCase();
  return products.value.filter(p => p.name.toLowerCase().includes(text));
});

const addToCart = (product) => {
  const existing = cart.value.find(item => item.productId === product.id);
  if (existing) { existing.units++; return; }
  cart.value.push({
    productId: product.id,
    productName: product.name,
    salePrice: product.salePrice,
    units: 1,
    discount: 0
  });
  triggerToast(`${product.name} added to cart`, "success");
};

const increaseQuantity = (item) => { item.units++; };

const decreaseQuantity = (item) => {
  if (item.units > 1) { item.units--; return; }
  removeItem(item.productId);
};

const removeItem = (productId) => {
  cart.value = cart.value.filter(item => item.productId !== productId);
};

const completeSale = async (paymentType = 'FULL') => {
  if (!customerId.value || !employeeId.value || !voucherTypeId.value) {
    triggerToast(t('sales.error_select'), "error");
    return;
  }
  if (cart.value.length === 0) {
    triggerToast(t('sales.error_empty_cart'), "error");
    return;
  }

  try {
    const cartSnapshot = [...cart.value];
    const cartTotal = cartSnapshot.reduce((sum, item) => sum + (item.salePrice * item.units) - item.discount, 0)

    const payload = {
      customerId: Number(customerId.value),
      employeeId: employeeId.value,
      voucherTypeId: Number(voucherTypeId.value),
      creditSale: paymentType !== 'FULL',
      initialPayment: paymentType === 'PARTIAL'
        ? Number(partialAmount.value)
        : paymentType === 'LATER'
          ? 0
          : cartTotal,
      dueDate: null,
      details: cartSnapshot.map(item => ({
        productId: item.productId,
        units: item.units,
        salePrice: item.salePrice,
        discount: item.discount
      }))
    };

    await salesService.create(payload);
    await loadSales();

    const createdSale = sales.value[0]
    currentInvoice.value = {
      voucherSerie: createdSale?.voucherSerie || 'A01',
      voucherNumber: createdSale?.voucherNumber || '',
      saleDate: createdSale?.saleDate || new Date().toISOString(),
      customerName: createdSale?.customerName || '',
      employeeName: createdSale?.employeeName || '',
      items: cartSnapshot,
      total: cartTotal,
      paymentType,
      partialAmount: paymentType === 'PARTIAL' ? Number(partialAmount.value) : null
    }

    cart.value = [];
    customerId.value = "";
    employeeId.value = "";
    voucherTypeId.value = "";
    partialAmount.value = 0;
    showCart.value = false;
    showPartialModal.value = false;
    showInvoiceModal.value = true;

  } catch (error) {
    triggerToast(error.response?.data?.message || "Error creating sale", "error");
  }
};

const viewInvoice = async (saleId) => {
  try {
    const response = await salesService.getById(saleId)
    const sale = response.data
    currentInvoice.value = {
      voucherSerie: sale.voucherSerie,
      voucherNumber: sale.voucherNumber,
      saleDate: sale.saleDate,
      customerName: sale.customerName,
      employeeName: sale.employeeName,
      items: sale.details?.map(d => ({
        productName: d.productName,
        units: d.units,
        salePrice: d.salePrice,
        discount: d.discount || 0
      })) || [],
      total: sale.total
    }
    showInvoiceModal.value = true
  } catch (error) {
    triggerToast("Error loading invoice", "error")
  }
};

const downloadInvoicePDF = () => {
  if (!currentInvoice.value) return;
  const doc = new jsPDF()
  const inv = currentInvoice.value

  doc.setFontSize(20)
  doc.setTextColor(33, 49, 65)
  doc.text('StrongChess POS', 14, 20)

  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text('INVOICE', 14, 30)

  doc.setFontSize(10)
  doc.setTextColor(33, 49, 65)
  doc.text(`Invoice: ${inv.voucherSerie}-${inv.voucherNumber}`, 14, 42)
  doc.text(`Date: ${inv.saleDate.split('T')[0]}`, 14, 49)
  doc.text(`Customer: ${inv.customerName}`, 14, 56)
  doc.text(`Employee: ${inv.employeeName}`, 14, 63)

  doc.setDrawColor(190, 241, 221)
  doc.setLineWidth(0.5)
  doc.line(14, 68, 196, 68)

  autoTable(doc, {
    startY: 74,
    head: [['Product', 'Qty', 'Unit Price', 'Discount', 'Subtotal']],
    body: inv.items.map(item => [
      item.productName,
      item.units,
      `$${Number(item.salePrice).toFixed(2)}`,
      `$${Number(item.discount || 0).toFixed(2)}`,
      `$${(item.salePrice * item.units - (item.discount || 0)).toFixed(2)}`
    ]),
    headStyles: { fillColor: [45, 74, 90], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 255, 250] },
    styles: { fontSize: 10 }
  })

  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(33, 49, 65)
  doc.text(`TOTAL: $${Number(inv.total).toFixed(2)}`, 14, finalY)

  if (inv.paymentType === 'PARTIAL') {
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(200, 100, 0)
    doc.text(`Paid: $${Number(inv.partialAmount).toFixed(2)}`, 14, finalY + 8)
    doc.text(`Pending: $${(inv.total - inv.partialAmount).toFixed(2)}`, 14, finalY + 15)
  } else if (inv.paymentType === 'LATER') {
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(200, 0, 0)
    doc.text(`PENDING PAYMENT: $${Number(inv.total).toFixed(2)}`, 14, finalY + 8)
  }

  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(150)
  doc.text('Thank you for your purchase!', 14, finalY + 25)

  doc.save(`invoice-${inv.voucherSerie}-${inv.voucherNumber}.pdf`)
}

const loadCustomers = async () => {
  try { customers.value = (await customerService.getAll()).data; }
  catch (e) { triggerToast("Error loading customers", "error"); }
};

const loadEmployees = async () => {
  try { employees.value = (await employeeService.getAll()).data; }
  catch (e) { triggerToast("Error loading employees", "error"); }
};

const loadVoucherTypes = async () => {
  try { voucherTypes.value = (await voucherTypeService.getAll()).data; }
  catch (e) { triggerToast("Error loading voucher types", "error"); }
};

const loadSales = async () => {
  try { sales.value = (await salesService.getAll()).data; }
  catch (e) { triggerToast("Error loading sales", "error"); }
};

onMounted(async () => {
  try {
    products.value = (await productService.getAll()).data;
    await loadCustomers();
    await loadEmployees();
    await loadVoucherTypes();
    await loadSales();
  } catch (e) { console.error(e); }
});

let toastTimeout;
const triggerToast = (message, type = "success") => {
  clearTimeout(toastTimeout);
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  toastTimeout = setTimeout(() => { showToast.value = false; }, 3000);
};
</script>

<template>
  <div class="space-y-4 lg:space-y-6">

    <Transition name="toast">
      <ToastNotification v-if="showToast" :message="toastMessage" :type="toastType" />
    </Transition>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ $t('sales.title') }}</h1>
        <p class="text-gray-600 text-sm lg:text-base">{{ $t('sales.subtitle') }}</p>
      </div>
      <button class="lg:hidden relative px-4 py-2 rounded-xl text-white font-medium text-sm"
        style="background-color:#213141" @click="showCart = true">
        🛒 {{ $t('sales.cart') }}
        <span v-if="cart.length > 0"
          class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {{ cart.length }}
        </span>
      </button>
    </div>

    <!-- Selects -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <select v-model="customerId" class="border rounded-lg px-4 py-3 text-sm">
        <option value="">{{ $t('sales.select_customer') }}</option>
        <option v-for="customer in customers" :key="customer.id" :value="customer.id">
          {{ customer.socialReason ? customer.socialReason : customer.firstname + ' ' + customer.lastname }}
        </option>
      </select>
      <select v-model="employeeId" class="border rounded-lg px-4 py-3 text-sm">
        <option value="">{{ $t('sales.select_employee') }}</option>
        <option v-for="employee in employees" :key="employee.id" :value="employee.id">
          {{ employee.firstname }} {{ employee.lastname }}
        </option>
      </select>
      <select v-model="voucherTypeId" class="border rounded-lg px-4 py-3 text-sm">
        <option value="">{{ $t('sales.select_voucher') }}</option>
        <option v-for="voucher in voucherTypes" :key="voucher.id" :value="voucher.id">
          {{ voucher.description }}
        </option>
      </select>
    </div>

    <!-- Layout productos + carrito -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Products -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
          <div class="mb-4">
            <input v-model="search" type="text" :placeholder="$t('sales.search_products')"
              class="w-full border rounded-lg px-4 py-3 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="product in filteredProducts" :key="product.id"
              class="border rounded-xl p-3 lg:p-4 hover:shadow-md transition">
              <h3 class="font-semibold text-sm lg:text-base">{{ product.name }}</h3>
              <p class="text-gray-500 text-xs lg:text-sm">Stock: {{ product.currentStock }}</p>
              <p class="text-lg lg:text-xl font-bold mt-2">${{ product.salePrice }}</p>
              <button @click="addToCart(product)"
                class="mt-3 w-full py-2 rounded-lg text-white text-sm"
                style="background-color:#213141;">
                {{ $t('sales.add') }}
              </button>
            </div>
          </div>
          <div v-if="filteredProducts.length === 0" class="text-center py-6 text-gray-500 text-sm">
            {{ $t('sales.no_products') }}
          </div>
        </div>
      </div>

      <!-- Cart desktop -->
      <div class="hidden lg:block">
        <div class="bg-white rounded-xl shadow-sm p-5">
          <h2 class="text-xl font-semibold mb-5 text-[#213141]">{{ $t('sales.current_sale') }}</h2>
          <div class="space-y-4">
            <div v-for="item in cart" :key="item.productId" class="flex justify-between border-b pb-3">
              <div>
                <div class="font-medium">{{ item.productName }}</div>
                <div class="flex items-center gap-2 mt-2">
                  <button @click="decreaseQuantity(item)" class="px-2 py-1 bg-gray-200 rounded">-</button>
                  <span>{{ item.units }}</span>
                  <button @click="increaseQuantity(item)" class="px-2 py-1 bg-gray-200 rounded">+</button>
                </div>
              </div>
              <div class="text-right">
                <div>${{ item.salePrice * item.units }}</div>
                <div class="text-xs text-gray-500">{{ item.units }} x ${{ item.salePrice }}</div>
                <button @click="removeItem(item.productId)" class="text-red-500 text-sm">{{ $t('sales.remove') }}</button>
              </div>
            </div>
            <div v-if="cart.length === 0" class="text-center text-gray-500 text-sm">{{ $t('sales.no_products') }}</div>
          </div>

          <div class="mt-6 space-y-2 border-t pt-4">
            <div class="flex justify-between text-sm"><span>{{ $t('sales.subtotal') }}</span><span>${{ formattedTotal }}</span></div>
            <div class="flex justify-between text-sm"><span>{{ $t('sales.tax') }}</span><span>$0.00</span></div>
            <div class="flex justify-between text-lg font-bold"><span>{{ $t('sales.total') }}</span><span>${{ formattedTotal }}</span></div>
          </div>

          <!-- Botones de pago -->
          <div class="mt-4 space-y-2">
            <button @click="completeSale('FULL')"
              class="w-full py-3 rounded-xl text-white font-semibold text-sm"
              style="background-color:#213141;">
              ✅ {{ $t('sales.pay_full') }}
            </button>
            <button @click="showPartialModal = true"
              class="w-full py-3 rounded-xl font-semibold text-sm border-2"
              style="border-color:#213141; color:#213141;">
              💰 {{ $t('sales.pay_partial') }}
            </button>
            <button @click="completeSale('LATER')"
              class="w-full py-3 rounded-xl font-semibold text-sm"
              style="background-color:#aaf7d9; color:#213141;">
              ⏳ {{ $t('sales.pay_later') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Sales -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b" style="background-color:#bef1dd;">
        <h2 class="font-semibold text-[#213141]">{{ $t('sales.recent_sales') }}</h2>
      </div>

      <table class="hidden lg:table w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left px-6 py-4">{{ $t('sales.invoice') }}</th>
            <th class="text-left px-6 py-4">{{ $t('sales.customer') }}</th>
            <th class="text-left px-6 py-4">{{ $t('sales.employee') }}</th>
            <th class="text-left px-6 py-4">{{ $t('sales.amount') }}</th>
            <th class="text-left px-6 py-4">{{ $t('sales.date') }}</th>
            <th class="text-left px-6 py-4">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sale in sales" :key="sale.id" class="border-b hover:bg-gray-50">
            <td class="px-6 py-4">{{ sale.voucherSerie }}-{{ sale.voucherNumber }}</td>
            <td class="px-6 py-4">{{ sale.customerName }}</td>
            <td class="px-6 py-4">{{ sale.employeeName }}</td>
            <td class="px-6 py-4">${{ sale.total.toFixed(2) }}</td>
            <td class="px-6 py-4">{{ sale.saleDate.split('T')[0] }}</td>
            <td class="px-6 py-4">
              <button @click="viewInvoice(sale.id)"
                class="px-3 py-1 rounded-lg text-white text-xs"
                style="background-color:#213141">
                🧾 {{ $t('sales.view_invoice') }}
              </button>
            </td>
          </tr>
          <tr v-if="sales.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-400">{{ $t('sales.no_sales') }}</td>
          </tr>
        </tbody>
      </table>

      <div class="lg:hidden divide-y">
        <div v-for="sale in sales" :key="sale.id" class="p-4">
          <div class="flex justify-between items-start mb-1">
            <div>
              <p class="font-semibold text-[#213141]">{{ sale.customerName }}</p>
              <p class="text-xs text-gray-500">{{ sale.voucherSerie }}-{{ sale.voucherNumber }}</p>
            </div>
            <p class="font-bold text-[#213141]">${{ sale.total.toFixed(2) }}</p>
          </div>
          <div class="flex justify-between items-center text-sm text-gray-500">
            <span>{{ sale.employeeName }}</span>
            <span>{{ sale.saleDate.split('T')[0] }}</span>
          </div>
          <button @click="viewInvoice(sale.id)"
            class="mt-2 w-full py-1 rounded-lg text-white text-xs"
            style="background-color:#213141">
            🧾 {{ $t('sales.view_invoice') }}
          </button>
        </div>
        <div v-if="sales.length === 0" class="p-6 text-center text-gray-400 text-sm">
          {{ $t('sales.no_sales') }}
        </div>
      </div>
    </div>

  </div>

  <!-- Cart Modal móvil -->
  <div v-if="showCart" class="fixed inset-0 bg-black/50 flex items-end justify-center z-50 lg:hidden">
    <div class="bg-white rounded-t-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-[#213141]">{{ $t('sales.current_sale') }}</h2>
        <button @click="showCart = false" class="text-2xl">✕</button>
      </div>
      <div class="space-y-4">
        <div v-for="item in cart" :key="item.productId" class="flex justify-between border-b pb-3">
          <div>
            <div class="font-medium">{{ item.productName }}</div>
            <div class="flex items-center gap-2 mt-2">
              <button @click="decreaseQuantity(item)" class="px-2 py-1 bg-gray-200 rounded">-</button>
              <span>{{ item.units }}</span>
              <button @click="increaseQuantity(item)" class="px-2 py-1 bg-gray-200 rounded">+</button>
            </div>
          </div>
          <div class="text-right">
            <div>${{ item.salePrice * item.units }}</div>
            <div class="text-xs text-gray-500">{{ item.units }} x ${{ item.salePrice }}</div>
            <button @click="removeItem(item.productId)" class="text-red-500 text-sm">{{ $t('sales.remove') }}</button>
          </div>
        </div>
        <div v-if="cart.length === 0" class="text-center text-gray-500 py-4">{{ $t('sales.no_products') }}</div>
      </div>

      <div class="mt-6 space-y-2 border-t pt-4">
        <div class="flex justify-between text-sm"><span>{{ $t('sales.subtotal') }}</span><span>${{ formattedTotal }}</span></div>
        <div class="flex justify-between text-sm"><span>{{ $t('sales.tax') }}</span><span>$0.00</span></div>
        <div class="flex justify-between text-lg font-bold"><span>{{ $t('sales.total') }}</span><span>${{ formattedTotal }}</span></div>
      </div>

      <!-- Botones de pago móvil -->
      <div class="mt-4 space-y-2">
        <button @click="completeSale('FULL')"
          class="w-full py-3 rounded-xl text-white font-semibold text-sm"
          style="background-color:#213141;">
          ✅ {{ $t('sales.pay_full') }}
        </button>
        <button @click="showPartialModal = true"
          class="w-full py-3 rounded-xl font-semibold text-sm border-2"
          style="border-color:#213141; color:#213141;">
          💰 {{ $t('sales.pay_partial') }}
        </button>
        <button @click="completeSale('LATER')"
          class="w-full py-3 rounded-xl font-semibold text-sm text-white"
          style="background-color:#f97316;">
          ⏳ {{ $t('sales.pay_later') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Partial Payment Modal -->
  <div v-if="showPartialModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl shadow-xl p-5 lg:p-6 w-full max-w-sm">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-xl font-bold text-[#213141]">💰 {{ $t('sales.pay_partial') }}</h2>
        <button @click="showPartialModal = false" class="text-2xl text-gray-400">✕</button>
      </div>

      <div class="space-y-4">
        <div class="bg-gray-50 rounded-xl p-4">
          <div class="flex justify-between text-sm font-bold">
            <span>{{ $t('sales.total') }}</span>
            <span>${{ formattedTotal }}</span>
          </div>
        </div>

        <div>
          <label class="block mb-1 font-medium text-sm">{{ $t('sales.initial_payment') }}</label>
          <input v-model="partialAmount" type="number" step="0.01" min="0.01"
            :max="total"
            class="w-full border rounded-lg px-3 py-2 text-sm"
            :placeholder="`Max: $${formattedTotal}`" />
          <p class="text-xs text-gray-400 mt-1">
            {{ $t('sales.remaining_debt') }}: ${{ Math.max(0, total - Number(partialAmount)).toFixed(2) }}
          </p>
        </div>
      </div>

      <div class="flex gap-3 mt-5">
        <button @click="showPartialModal = false"
          class="flex-1 py-2 border rounded-xl text-sm">
          {{ $t('common.cancel') }}
        </button>
        <button @click="completeSale('PARTIAL')"
          class="flex-1 py-2 rounded-xl text-white text-sm font-medium"
          style="background-color:#213141">
          {{ $t('common.confirm') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Invoice Modal -->
  <div v-if="showInvoiceModal && currentInvoice"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

      <div class="p-6 border-b" style="background-color:#2D4A5A;">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-xl font-bold text-white">♜ StrongChess POS</h2>
            <p class="text-sm mt-1" style="color:#bef1dd">{{ $t('sales.invoice_label') }}</p>
          </div>
          <div class="text-right">
            <p class="text-white font-bold">{{ currentInvoice.voucherSerie }}-{{ currentInvoice.voucherNumber }}</p>
            <p class="text-sm" style="color:#bef1dd">{{ currentInvoice.saleDate.split('T')[0] }}</p>
          </div>
        </div>
      </div>

      <div class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-400">{{ $t('sales.customer') }}</p>
            <p class="font-medium text-[#213141]">{{ currentInvoice.customerName }}</p>
          </div>
          <div>
            <p class="text-gray-400">{{ $t('sales.employee') }}</p>
            <p class="font-medium text-[#213141]">{{ currentInvoice.employeeName }}</p>
          </div>
        </div>

        <table class="w-full text-sm mt-4">
          <thead>
            <tr class="border-b" style="color:#2D4A5A">
              <th class="text-left py-2">{{ $t('sales.product') }}</th>
              <th class="text-center py-2">{{ $t('sales.qty') }}</th>
              <th class="text-right py-2">{{ $t('sales.unit_price') }}</th>
              <th class="text-right py-2">{{ $t('sales.subtotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in currentInvoice.items" :key="item.productName" class="border-b">
              <td class="py-2">{{ item.productName }}</td>
              <td class="text-center py-2">{{ item.units }}</td>
              <td class="text-right py-2">${{ Number(item.salePrice).toFixed(2) }}</td>
              <td class="text-right py-2">${{ (item.salePrice * item.units - (item.discount || 0)).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="border-t pt-4 space-y-1">
          <div class="flex justify-between text-sm text-gray-500">
            <span>{{ $t('sales.subtotal') }}</span>
            <span>${{ Number(currentInvoice.total).toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-500">
            <span>{{ $t('sales.tax') }}</span><span>$0.00</span>
          </div>
          <div class="flex justify-between text-lg font-bold" style="color:#213141">
            <span>{{ $t('sales.total') }}</span>
            <span>${{ Number(currentInvoice.total).toFixed(2) }}</span>
          </div>

          <!-- Pago parcial info -->
          <div v-if="currentInvoice.paymentType === 'PARTIAL'" class="mt-3 p-3 bg-orange-50 rounded-xl text-sm">
            <div class="flex justify-between text-orange-700">
              <span>{{ $t('sales.initial_payment') }}</span>
              <span>${{ Number(currentInvoice.partialAmount).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-red-600 font-bold mt-1">
              <span>{{ $t('sales.remaining_debt') }}</span>
              <span>${{ (currentInvoice.total - currentInvoice.partialAmount).toFixed(2) }}</span>
            </div>
          </div>

          <!-- Pagar después info -->
          <div v-if="currentInvoice.paymentType === 'LATER'" class="mt-3 p-3 bg-red-50 rounded-xl text-sm">
            <div class="flex justify-between text-red-600 font-bold">
              <span>{{ $t('sales.remaining_debt') }}</span>
              <span>${{ Number(currentInvoice.total).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <p class="text-center text-xs text-gray-400 mt-4">{{ $t('sales.thank_you') }}</p>
      </div>

      <div class="px-6 pb-6 flex gap-3">
        <button @click="showInvoiceModal = false" class="flex-1 py-2 border rounded-xl text-sm">
          {{ $t('common.close') }}
        </button>
        <button @click="downloadInvoicePDF"
          class="flex-1 py-2 rounded-xl text-white text-sm font-medium"
          style="background-color:#dc2626">
          📄 {{ $t('sales.download_pdf') }}
        </button>
      </div>

    </div>
  </div>

</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(100%); }
.toast-leave-to { opacity: 0; transform: translateX(100%); }
</style>