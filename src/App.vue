<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive :exclude="['LoginView']">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
