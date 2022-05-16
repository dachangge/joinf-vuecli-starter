<template>
  <el-dialog title="提示" :visible.sync="visible">
    <span>这是一段信息</span>
    <span slot="footer" class="dialog-footer">
      <el-button @click="resolve(11)">取 消</el-button>
      <el-button type="primary" @click="reject(22)">确 定</el-button>
    </span>
  </el-dialog>
</template>
<script>
export default {
  name: "testDialog",
};
</script>
