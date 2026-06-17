<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import customerService from "../services/customerService";
import ToastNotification from "../components/ToastNotification.vue";
import CustomerModal from "../components/CustomerModal.vue";

const { t } = useI18n();

const customers = ref([]);
const search = ref("");
const showModal = ref(false);
const showDeleteModal = ref(false);
const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref("success");
const isEditing = ref(false);
const editingId = ref(null);
const customerToDelete = ref(null);

const form = ref({
  firstname: '', middlename: '', lastname: '', surname: '',
  socialReason: '', commercialName: '', email: '',
  phoneNumber: '', documentNumber: '', address: ''
})

const triggerToast = (message, type = "success") => {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 3000);
};

const createCustomer = async (customer) => {
  try {
    await customerService.create({
      documentTypeId: 1, personTypeId: 1, genderId: 1,
      departmentId: 1, provinceId: 1, districtId: 1,
      birthdate: "2000-01-01",
      registrationDate: new Date().toISOString(),
      ...customer
    });
    await loadCustomers();
    showModal.value = false;
    triggerToast(t('customers.created'), "success");
  } catch (error) {
    console.error(error);
    triggerToast(t('customers.error_create'), "error");
  }
};

const editCustomer = (customer) => {
  isEditing.value = true;
  editingId.value = customer.id;
  form.value = {
    firstname: customer.firstname || '',
    middlename: customer.middlename || '',
    lastname: customer.lastname || '',
    surname: customer.surname || '',
    socialReason: customer.socialReason || '',
    commercialName: customer.commercialName || '',
    email: customer.email || '',
    phoneNumber: customer.phoneNumber || '',
    documentNumber: customer.documentNumber || '',
    address: customer.address || ''
  }
  showModal.value = true;
};

const saveCustomer = async (customer) => {
  try {
    if (isEditing.value) {
      await customerService.update(editingId.value, {
        documentTypeId: 1, personTypeId: 1, genderId: 1,
        departmentId: 1, provinceId: 1, districtId: 1,
        birthdate: "2000-01-01",
        ...customer
      });
      triggerToast(t('customers.updated'), "success");
    } else {
      await customerService.create({
        documentTypeId: 1, personTypeId: 1, genderId: 1,
        departmentId: 1, provinceId: 1, districtId: 1,
        birthdate: "2000-01-01",
        registrationDate: new Date().toISOString(),
        ...customer
      });
      triggerToast(t('customers.created'), "success");
    }
    await loadCustomers();
    showModal.value = false;
    isEditing.value = false;
    editingId.value = null;
  } catch (error) {
    console.error(error);
    triggerToast(t('customers.error_create'), "error");
  }
};

const confirmDelete = (id) => {
  customerToDelete.value = id;
  showDeleteModal.value = true;
};

const deleteCustomer = async () => {
  try {
    await customerService.delete(customerToDelete.value);
    await loadCustomers();
    showDeleteModal.value = false;
    triggerToast(t('customers.deleted'), "success");
  } catch (error) {
    console.error(error);
    triggerToast(t('customers.error_delete'), "error");
  }
};

const filteredCustomers = computed(() => {
  if (!search.value) return customers.value;
  const text = search.value.toLowerCase();
  return customers.value.filter(c =>
    (c.firstname + " " + c.lastname + " " + c.socialReason).toLowerCase().includes(text)
  );
});

const loadCustomers = async () => {
  try {
    customers.value = (await customerService.getAll()).data;
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => { loadCustomers(); });
</script>

<template>
  <div class="space-y-4 lg:space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ $t('customers.title') }}</h1>
        <p class="text-gray-600 text-sm lg:text-base">{{ $t('customers.subtitle') }}</p>
      </div>
      <button @click="isEditing = false; showModal = true"
        class="px-3 py-2 lg:px-5 lg:py-3 rounded-xl text-white font-medium text-sm lg:text-base"
        style="background-color:#213141;">
        {{ $t('customers.add') }}
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('customers.total') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ customers.length }}</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('customers.new_this_month') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-green-600">0</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('customers.vip') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-amber-600">0</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('customers.active_customers') }}</p>
        <h2 class="text-2xl lg:text-3xl font-bold text-blue-600">0</h2>
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
      <div class="flex flex-col sm:flex-row gap-3">
        <input v-model="search" type="text" :placeholder="$t('customers.search')"
          class="flex-1 border rounded-lg px-4 py-2 text-sm" />
        <select class="border rounded-lg px-4 py-2 text-sm">
          <option>{{ $t('customers.all') }}</option>
          <option>VIP</option>
          <option>{{ $t('common.active') }}</option>
          <option>{{ $t('common.inactive') }}</option>
        </select>
      </div>
    </div>

    <!-- Tabla desktop -->
    <div class="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b" style="background-color:#bef1dd;">
        <h2 class="font-semibold text-[#213141]">{{ $t('customers.list') }}</h2>
      </div>
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left px-6 py-4">{{ $t('customers.name') }}</th>
            <th class="text-left px-6 py-4">{{ $t('customers.email') }}</th>
            <th class="text-left px-6 py-4">{{ $t('customers.phone') }}</th>
            <th class="text-left px-6 py-4">{{ $t('customers.purchases') }}</th>
            <th class="text-left px-6 py-4">{{ $t('customers.total_spent') }}</th>
            <th class="text-left px-6 py-4">{{ $t('common.status') }}</th>
            <th class="text-left px-6 py-4">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in filteredCustomers" :key="customer.id" class="border-b hover:bg-gray-50">
            <td class="px-6 py-4">
              {{ customer.socialReason ? customer.socialReason : customer.firstname + " " + customer.lastname }}
            </td>
            <td class="px-6 py-4">{{ customer.email }}</td>
            <td class="px-6 py-4">{{ customer.phoneNumber }}</td>
            <td class="px-6 py-4">-</td>
            <td class="px-6 py-4">-</td>
            <td class="px-6 py-4">
              <span class="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                {{ $t('common.active') }}
              </span>
            </td>
            <td class="px-6 py-4">
              <button class="mr-3" @click="editCustomer(customer)">✏️</button>
              <button @click="confirmDelete(customer.id)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cards móvil -->
    <div class="lg:hidden space-y-3">
      <div class="px-1 py-2">
        <h2 class="font-semibold text-[#213141]">{{ $t('customers.list') }}</h2>
      </div>
      <div v-for="customer in filteredCustomers" :key="customer.id"
        class="bg-white rounded-xl shadow-sm p-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="font-semibold text-[#213141]">
              {{ customer.socialReason ? customer.socialReason : customer.firstname + " " + customer.lastname }}
            </p>
            <p class="text-sm text-gray-500">{{ customer.email }}</p>
          </div>
          <span class="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
            {{ $t('common.active') }}
          </span>
        </div>
        <div class="flex justify-between items-center text-sm text-gray-600">
          <span>📞 {{ customer.phoneNumber || '-' }}</span>
          <div>
            <button class="mr-3" @click="editCustomer(customer)">✏️</button>
            <button @click="confirmDelete(customer.id)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Customer Modal -->
  <CustomerModal
    v-if="showModal"
    :initial-data="isEditing ? form : null"
    :is-editing="isEditing"
    @close="showModal = false; isEditing = false"
    @save="saveCustomer" />

  <!-- Delete Modal -->
  <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
      <h2 class="text-xl font-bold text-[#213141] mb-4">{{ $t('customers.delete_title') }}</h2>
      <p class="text-gray-600 mb-6">{{ $t('customers.delete_confirm') }}</p>
      <div class="flex justify-end gap-3">
        <button @click="showDeleteModal = false" class="px-4 py-2 border rounded-lg text-sm">
          {{ $t('common.cancel') }}
        </button>
        <button @click="deleteCustomer" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
          {{ $t('common.delete') }}
        </button>
      </div>
    </div>
  </div>

  <Transition name="toast">
    <ToastNotification v-if="showToast" :message="toastMessage" :type="toastType" />
  </Transition>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(100%); }
.toast-leave-to { opacity: 0; transform: translateX(100%); }
</style>