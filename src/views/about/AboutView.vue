<template>
  <div class="about">
    <h1>This is an about page</h1>
    <h1>{{ 194863871623 | date }}</h1>
    <el-button type="primary">hello world</el-button>
    <svgIcon type="add" />
    <svgIcon type="accurate" />
    <svgIcon type="add-to-blacklist" />
    <el-input />
  </div>
</template>
<script>
import TestDialogVue from "./dialogs/TestDialog.vue";
export default {
  data() {
    return {};
  },
  created() {
    API.pet.getPetById.request({ petId: 1 }).then(console.log);
    this.$modal.open(TestDialogVue).then(console.log, console.error);
    console.log("process.env.VUE_APP_version:", process.env.VUE_APP_version);
  },
};
</script>
<style lang="scss">
h1 {
  color: red;
}
</style>
