  var app = new Vue({
      el: "#app",
      mixins: mixinList, //Ensures we use the data, methods etc configured on each page.
      data:{
        config: {
            apiUrl: '',
            successMessage: null,
            errorMessage: null,
            loading: false,
            loadingFetch: false
        }
      },
      methods: {
        handleServerError (err) {
            this.loading = false;   

            let errorMessage;

            if (err.response.data.message) {
                errorMessage = err.response.data.message;
            } 

            this.errorMessage = errorMessage || err.response.statusText || this.technicalIssue;
        },
        fetchResource () {

            this.loadingFetch = true;

            let url = `${this.config.apiUrl}/${this.resourceName}`;

            axios.get(url).then((response) => {
            this.loadingFetch = false;     
            let data = response.data;
            
            this.resource = data;

            }).catch(this.handleServerError);
        },
        formatAmount (amount){
            return Number(amount).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
        }
      }
  });