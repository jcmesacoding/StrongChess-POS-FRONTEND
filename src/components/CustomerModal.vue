<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  initialData: { type: Object, default: null },
  isEditing: { type: Boolean, default: false }
});

const emit = defineEmits(["close", "save"]);

const form = ref({
  firstname: "",
  middlename: "",
  lastname: "",
  surname: "",
  socialReason: "",
  commercialName: "",
  email: "",
  phoneNumber: "",
  documentNumber: "",
  address: ""
});

// Cuando se abre en modo edición, rellena el formulario
watch(() => props.initialData, (data) => {
  if (data) {
    form.value = { ...data }
  }
}, { immediate: true })

const save = () => {
  if (!form.value.firstname || form.value.firstname.trim().length < 2) return;
  if (!form.value.lastname || form.value.lastname.trim().length < 2) return;
  emit("save", { ...form.value });
};
</script>

<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl p-5 lg:p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">

      <div class="flex justify-between items-center mb-5">
        <h2 class="text-xl lg:text-2xl font-bold" style="color:#213141">
          {{ isEditing ? $t('customers.edit_title') : $t('customers.new_title') }}
        </h2>
        <button @click="emit('close')" class="text-2xl text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input v-model="form.firstname" :placeholder="$t('customers.first_name')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.middlename" :placeholder="$t('customers.middle_name')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.lastname" :placeholder="$t('customers.last_name')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.surname" :placeholder="$t('customers.surname')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.socialReason" :placeholder="$t('customers.social_reason')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.commercialName" :placeholder="$t('customers.commercial_name')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.email" :placeholder="$t('customers.email')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.phoneNumber" :placeholder="$t('customers.phone')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.documentNumber" :placeholder="$t('customers.document')"
          class="border rounded-lg p-3 text-sm w-full" />
        <input v-model="form.address" :placeholder="$t('customers.address')"
          class="border rounded-lg p-3 text-sm w-full sm:col-span-2" />
      </div>

      <div class="flex justify-end gap-3 mt-5">
        <button @click="emit('close')" class="px-4 py-2 border rounded-xl text-sm">
          {{ $t('common.cancel') }}
        </button>
        <button type="button" @click="save"
          class="px-4 py-2 rounded-xl text-white text-sm"
          style="background:#213141">
          {{ isEditing ? $t('customers.save') : $t('customers.save') }}
        </button>
      </div>

    </div>
  </div>
</template>