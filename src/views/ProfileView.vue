<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import userService from '../services/userService'

const { t } = useI18n();

const user = ref(null)
const loading = ref(true)

const loadProfile = async () => {
  try {
    user.value = (await userService.getMe()).data
  } catch (error) {
    console.error('Error loading profile:', error)
  } finally {
    loading.value = false
  }
}

const getRoleBadgeClass = (role) => {
  if (role === 'ADMIN') return 'bg-purple-100 text-purple-700'
  if (role === 'WRITE') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-700'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

onMounted(() => { loadProfile() })
</script>

<template>
  <div class="space-y-4 lg:space-y-6 max-w-2xl mx-auto">

    <!-- Header -->
    <div>
      <h1 class="text-2xl lg:text-3xl font-bold text-[#213141]">{{ $t('profile.title') }}</h1>
      <p class="text-gray-600 text-sm lg:text-base">{{ $t('profile.subtitle') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
      {{ $t('profile.loading') }}
    </div>

    <div v-else-if="user">

      <!-- Avatar + Name -->
      <div class="bg-white rounded-xl shadow-sm p-6 flex items-center gap-5">
        <div class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
          style="background-color:#213141">
          {{ user.firstName?.charAt(0).toUpperCase() }}
        </div>
        <div>
          <h2 class="text-xl font-bold text-[#213141]">
            {{ user.firstName }} {{ user.lastName }}
          </h2>
          <p class="text-gray-500 text-sm">@{{ user.username }}</p>
          <div class="flex gap-2 mt-2">
            <span v-for="role in user.roles" :key="role" class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getRoleBadgeClass(role)">
              {{ role }}
            </span>
          </div>
        </div>
      </div>

      <!-- Details -->
      <div class="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h3 class="font-semibold text-[#213141]">{{ $t('profile.details') }}</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-gray-400 mb-1">{{ $t('profile.first_name') }}</p>
            <p class="font-medium text-[#213141]">{{ user.firstName }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-1">{{ $t('profile.last_name') }}</p>
            <p class="font-medium text-[#213141]">{{ user.lastName }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-1">{{ $t('profile.username') }}</p>
            <p class="font-medium text-[#213141]">{{ user.username }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-1">{{ $t('profile.email') }}</p>
            <p class="font-medium text-[#213141]">{{ user.email }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-1">{{ $t('common.status') }}</p>
            <span class="px-2 py-1 rounded-full text-xs"
              :class="user.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
              {{ user.enabled ? $t('common.active') : $t('common.inactive') }}
            </span>
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-1">{{ $t('profile.member_since') }}</p>
            <p class="font-medium text-[#213141]">{{ formatDate(user.registrationDate) }}</p>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>