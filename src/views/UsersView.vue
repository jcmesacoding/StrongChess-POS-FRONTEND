<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import authService from '../services/authService'
import userService from '../services/userService'

const { t } = useI18n();

const users = ref([])
const showModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const userToDelete = ref(null)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  username: '',
  password: '',
  email: '',
  firstName: '',
  lastName: '',
  role: 'READ'
})

const resetForm = () => {
  form.value = {
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'READ'
  }
  errorMessage.value = ''
  isEditing.value = false
  editingId.value = null
}

const loadUsers = async () => {
  try {
    users.value = (await userService.getAll()).data
  } catch (error) {
    console.error('Error loading users:', error)
  }
}

const openEdit = (user) => {
  isEditing.value = true
  editingId.value = user.id
  form.value = {
    username: user.username,
    password: '',
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.roles[0] || 'READ'
  }
  showModal.value = true
}

const confirmDelete = (id) => {
  userToDelete.value = id
  showDeleteModal.value = true
}

const deleteUser = async () => {
  try {
    await userService.delete(userToDelete.value)
    showDeleteModal.value = false
    await loadUsers()
    showSuccess('User deleted successfully')
  } catch (error) {
    console.error('Error deleting user:', error)
  }
}

const saveUser = async () => {
  errorMessage.value = ''
  try {
    if (isEditing.value) {
      await userService.update(editingId.value, form.value)
      showSuccess(`User ${form.value.username} updated successfully`)
    } else {
      await authService.register(form.value)
      showSuccess(`User ${form.value.username} created successfully`)
    }
    showModal.value = false
    resetForm()
    await loadUsers()
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error saving user'
  }
}

const showSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => { successMessage.value = '' }, 3000)
}

onMounted(() => { loadUsers() })
</script>

<template>
  <div class="space-y-4 lg:space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ $t('users.title') }}</h1>
        <p class="text-gray-600 text-sm lg:text-base">{{ $t('users.subtitle') }}</p>
      </div>
      <button @click="showModal = true; resetForm()"
        class="px-3 py-2 lg:px-5 lg:py-3 rounded-xl text-white font-medium text-sm lg:text-base"
        style="background-color:#213141;">
        {{ $t('users.add') }}
      </button>
    </div>

    <!-- Success toast -->
    <div v-if="successMessage"
      class="px-5 py-3 rounded-xl bg-green-100 text-green-700 text-sm">
      {{ successMessage }}
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6">
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('users.total') }}</p>
        <h2 class="text-2xl font-bold text-[#213141]">{{ users.length }}</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('users.admins') }}</p>
        <h2 class="text-2xl font-bold text-[#213141]">
          {{ users.filter(u => u.roles.includes('ADMIN')).length }}
        </h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 lg:p-5">
        <p class="text-gray-500 text-sm">{{ $t('users.employees') }}</p>
        <h2 class="text-2xl font-bold text-[#213141]">
          {{ users.filter(u => !u.roles.includes('ADMIN')).length }}
        </h2>
      </div>
    </div>

    <!-- Tabla desktop -->
    <div class="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b" style="background-color:#bef1dd;">
        <h2 class="font-semibold text-[#213141]">{{ $t('users.list') }}</h2>
      </div>
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left px-6 py-4">{{ $t('users.username') }}</th>
            <th class="text-left px-6 py-4">{{ $t('users.name') }}</th>
            <th class="text-left px-6 py-4">{{ $t('users.email') }}</th>
            <th class="text-left px-6 py-4">{{ $t('users.role') }}</th>
            <th class="text-left px-6 py-4">{{ $t('common.status') }}</th>
            <th class="text-left px-6 py-4">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-medium">{{ user.username }}</td>
            <td class="px-6 py-4">{{ user.firstName }} {{ user.lastName }}</td>
            <td class="px-6 py-4">{{ user.email }}</td>
            <td class="px-6 py-4">
              <span v-for="role in user.roles" :key="role"
                class="px-2 py-1 rounded-full text-xs mr-1"
                :class="{
                  'bg-purple-100 text-purple-700': role === 'ADMIN',
                  'bg-blue-100 text-blue-700': role === 'WRITE',
                  'bg-gray-100 text-gray-700': role === 'READ'
                }">
                {{ role }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="px-3 py-1 rounded-full text-sm"
                :class="user.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ user.enabled ? $t('common.active') : $t('common.inactive') }}
              </span>
            </td>
            <td class="px-6 py-4">
              <button class="mr-3" @click="openEdit(user)">✏️</button>
              <button @click="confirmDelete(user.id)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cards móvil -->
    <div class="lg:hidden space-y-3">
      <div class="px-1 py-2">
        <h2 class="font-semibold text-[#213141]">{{ $t('users.list') }}</h2>
      </div>
      <div v-for="user in users" :key="user.id"
        class="bg-white rounded-xl shadow-sm p-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="font-semibold text-[#213141]">{{ user.username }}</p>
            <p class="text-sm text-gray-500">{{ user.firstName }} {{ user.lastName }}</p>
            <p class="text-xs text-gray-400">{{ user.email }}</p>
          </div>
          <div class="text-right space-y-1">
            <span v-for="role in user.roles" :key="role"
              class="px-2 py-1 rounded-full text-xs block"
              :class="{
                'bg-purple-100 text-purple-700': role === 'ADMIN',
                'bg-blue-100 text-blue-700': role === 'WRITE',
                'bg-gray-100 text-gray-700': role === 'READ'
              }">
              {{ role }}
            </span>
            <span class="px-2 py-1 rounded-full text-xs block"
              :class="user.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
              {{ user.enabled ? $t('common.active') : $t('common.inactive') }}
            </span>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-2">
          <button @click="openEdit(user)">✏️</button>
          <button @click="confirmDelete(user.id)">🗑️</button>
        </div>
      </div>
    </div>

  </div>

  <!-- Create/Edit Modal -->
  <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl shadow-xl p-5 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">

      <div class="flex justify-between items-center mb-5">
        <h2 class="text-xl font-bold text-[#213141]">{{ isEditing ? $t('users.edit') : $t('users.new') }}</h2>
        <button @click="showModal = false; resetForm()" class="text-2xl text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div class="space-y-3">
        <div>
          <label class="block mb-1 font-medium text-sm">{{ $t('users.username') }}</label>
          <input v-model="form.username" placeholder="e.g. john01"
            class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-sm">
            {{ $t('users.password') }} {{ isEditing ? '(leave blank to keep current)' : '' }}
          </label>
          <input v-model="form.password" type="password" placeholder="Min 6 characters"
            class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-sm">{{ $t('users.email') }}</label>
          <input v-model="form.email" type="email" placeholder="email@example.com"
            class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block mb-1 font-medium text-sm">{{ $t('users.first_name') }}</label>
            <input v-model="form.firstName" placeholder="First name"
              class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-sm">{{ $t('users.last_name') }}</label>
            <input v-model="form.lastName" placeholder="Last name"
              class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium text-sm">{{ $t('users.role') }}</label>
          <select v-model="form.role" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="ADMIN">{{ $t('users.role_admin') }}</option>
            <option value="WRITE">{{ $t('users.role_write') }}</option>
            <option value="READ">{{ $t('users.role_read') }}</option>
          </select>
        </div>

        <div v-if="errorMessage"
          class="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {{ errorMessage }}
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-5">
        <button @click="showModal = false; resetForm()" class="px-4 py-2 border rounded-lg text-sm">
          {{ $t('users.cancel') }}
        </button>
        <button @click="saveUser" class="px-4 py-2 rounded-lg text-white text-sm"
          style="background-color:#213141">
          {{ isEditing ? $t('users.update') : $t('users.create') }}
        </button>
      </div>

    </div>
  </div>

  <!-- Delete Modal -->
  <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
      <h2 class="text-xl font-bold text-[#213141] mb-4">{{ $t('users.delete_title') }}</h2>
      <p class="text-gray-600 mb-6">{{ $t('users.delete_confirm') }}</p>
      <div class="flex justify-end gap-3">
        <button @click="showDeleteModal = false" class="px-4 py-2 border rounded-lg text-sm">{{ $t('users.cancel') }}</button>
        <button @click="deleteUser" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">{{ $t('users.delete') }}</button>
      </div>
    </div>
  </div>
</template>