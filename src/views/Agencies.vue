<template>
  <div class="data">
    <h2>Agencies</h2>
    <div class="mb-4">
      <router-link to="/new_agency" class="btn btn-primary"
        >Create New Agency</router-link
      >
    </div>
    <div>
      <DataTable v-if="agencies" :table="table" :rows="agencies" :user="user" />
    </div>
  </div>
</template>

<script>
import DataTable from '../components/DataTable'
import AgencyLink from '../components/AgencyLink'
export default {
  name: 'Agencies',
  components: {
    DataTable
  },
  data: function () {
    const user = this.$store.state.user
    return {
      user,
      table: {
        views: [],
        columns: [
          { name: 'code', label: 'Agency Code' },
          { name: 'name' },
          { component: AgencyLink }
        ]
      }
    }
  },
  computed: {
    agencies: function () {
      return this.$store.state.agencies
    }
  }
}
</script>
<style scoped>
.data {
  width: 90%;
  margin: 0 auto;
}
table {
  width: 100%;
  margin: 50px auto;
}
h2,
td {
  text-align: left;
}
</style>
