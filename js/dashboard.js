var store = {
  portfolioTotal: [],
  portfolio: [],
  portfolioComplete: [],
  referrals: [],
  transactions: [],
  profile: {
    wallet: { funds: 0, ledger: 0, bonus: { balance: 0, pending: 0 } },
    email: '',
    fullname: '',
    refCode: '',
    title: '',
    dob: '',
    totalInvestment: '',
    totalPayouts: '',
    totalYield: '',
    bank: {}
  },
  cpData: {
    password: "",
    newPassword: "",
    confirmPassword: "",
  },
  bank: {},
  payoutAmount: 0,
  fundWalletAmount: 0,
  loadingPassword: false
};

function getDashboardData() {
  getData('/user/dashboard', true, function(status, data) {
    if (!status) {
    } else if (status == 200) {
      store.portfolioTotal = determinePortfolioPrintLength(data.portfolio.slice()); // uses a copy of portfolio without reference
      store.portfolio = data.portfolio.filter(entry => entry.payout !== 'paid');
      store.portfolioComplete = data.portfolio.filter(entry => entry.payout === 'paid');
      store.transactions = data.transactions;
      store.referrals = data.referrals;
      store.profile = data.profile;
      store.paystackKey = data.paystackKey;
      if (data.profile.bank) {
        store.bank.accountName = data.profile.bank.accountName;
        store.bank.accountNumber = data.profile.bank.accountNumber;
        store.bank.bankName = data.profile.bank.bankName;
      } else store.profile.bank = {};
      var a2aKit = document.getElementsByClassName('a2a_kit')[0];
      a2aKit.setAttribute(
        'data-a2a-url',
        'https://agropartnerships.co/sign-up?ref=' + data.profile.refCode
      );
      a2aKit.setAttribute(
        'data-a2a-title',
        'Use My referral code, ' + data.profile.refCode
      );
      document.getElementById('app-main').style.visibility = 'visible';
    } else if (status == 401) {
      goToSignIn();
    } else if (status == 500) {
    }
  });
}
getDashboardData();

function initInvest() {
  getWallet();
}

function payWithPaystack(data) {
  var handler = PaystackPop.setup({
    key: data.key,
    email: data.email,
    amount: data.amount * 100,
    //ref: data._id,
    metadata: {
       custom_fields: [
          {
            "display_name":"Transaction Type",
            "variable_name":"transaction_type",
            "value":"fund-wallet"
          }
       ]
    },
    callback: function(response) {
      data.reference = response.reference;
      verifyPayment(data);
    },
    onClose: function() {
      data.loader.removeLoader();
    }
  });
  handler.openIframe();
}

function verifyPayment(req) {
  postData(
    '/user/wallet/fund/verify',
    { reference: req.reference },
    true,
    function(status, data) {
      if (!status) {
        showFeedback(true, 'Connection failed.');
      } else if (status == 200) {
        store.profile.wallet = data.wallet;
        store.fundWalletAmount = 0;

        var fundWalletBox = document.getElementsByClassName(
          'fund-wallet-box'
        )[0];
        var successfulFund = document.getElementsByClassName(
          'successful-fund'
        )[0];

        fundWalletBox.style.display = 'none';
        successfulFund.style.display = 'flex';

        setTimeout(function() {
          successfulFund.style.display = 'none';
          fundWalletBox.style.display = 'flex';
        }, 10000);
      } else if (status == 400) {
        showErrors(data, req.feedBackHolder);
      } else if (status == 401) {
        goToSignIn();
      } else if (status == 500) {
        showFeedback(
          true,
          "Oops! Something went wrong. If your transaction was successful, your wallet will be credited. If it isn't, please contact support with the ref number " +
            req.reference
        );
      }
      req.loader.removeLoader();
    }
  );
}

function showErrors(data, feedBackHolder) {
  var err = [];
  for (var key in data) {
    if (key == 'wallet') {
      store.wallet.balance = data[key].funds + data[key].bonus.balance;
    } else {
      err.push(data[key]);
    }
  }
  if (err.length > 0) showFeedback(true, err.join('\n'), feedBackHolder);
}

function determinePortfolioPrintLength  (portfolioTotal) {
  let desiredLength;
  const length = portfolioTotal.length;
  if (length < 32) {
    desiredLength = 32;
  } else if (length < 78) {
    desiredLength = 78;
  } else if (length < 124) {
    desiredLength = 124;
  }
  while (portfolioTotal.length < desiredLength) {
    portfolioTotal.push({});
  }
  return portfolioTotal;
}

new Vue({
  el: '#app-main',
  data: store,
  methods: {
    payout: function(event) {
      event.preventDefault();
      var _self = this;
      var form = event.target;
      var loader = new ButtonLoader(form.getElementsByClassName('submit')[0]);
      loader.setLoader();

      var feedBackHolder = form.getElementsByClassName('feedback-holder')[0];

      var amount = ',' + _self.payoutAmount;
      amount = amount.replace(/,/g, '');
      if (!Validate.amount(amount) || this.amount > this.profile.wallet.funds) {
        showFeedback(true, 'Invalid amount', feedBackHolder);
        return;
      }

      var payload = {
        amount: amount
      };

      postData('/user/payout', payload, true, function(status, data) {
        if (!status) {
          showFeedback(true, 'Connection failed.', feedBackHolder);
        } else if (status == 200) {
          _self.profile.wallet = data.wallet;
          _self.payoutAmount = 0;
          showFeedback(
            false,
            'Your payout request is being processed.',
            feedBackHolder
          );
        } else if (status == 400) {
          showErrors(data, feedBackHolder);
        } else if (status == 401) {
          goToSignIn();
        } else if (status == 500) {
          showFeedback(
            true,
            'Oops! Something went wrong. Please try again later',
            feedBackHolder
          );
        }
        loader.removeLoader();
      });
    },
    fundWallet: function(event) {
      event.preventDefault();
      var _self = this;
      var form = event.target;
      var loader = new ButtonLoader(form.getElementsByClassName('submit')[0]);

      var feedBackHolder = form.getElementsByClassName('feedback-holder')[0];

      var amount = ',' + _self.fundWalletAmount;
      amount = amount.replace(/,/g, '');
      if (!Validate.amount(amount) || amount < 1) {
        showFeedback(true, 'Invalid amount', feedBackHolder);
        return;
      }

      loader.setLoader();
      payWithPaystack({
        key: store.paystackKey,
        email: _self.profile.email,
        amount: amount,
        loader: loader,
        feedBackHolder: feedBackHolder
      });
    },
    updateProfile: function(event) {
      event.preventDefault();
      var _self = this;
      var form = event.target;
      var loader = new ButtonLoader(form.getElementsByClassName('submit')[0]);
      loader.setLoader();

      var feedBackHolder = form.getElementsByClassName('feedback-holder')[0];

      if (!Validate.required(this.profile.fullname)) {
        showFeedback(true, 'Please enter a valid name', feedBackHolder);
        return;
      }

      var payload = {
        title: this.profile.title,
        fullname: this.profile.fullname,
        phone: this.profile.phone,
  			dob: this.profile.dob
      };

      postData('/user/profile', payload, true, function(status, data) {
        if (!status) {
          showFeedback(true, 'Connection failed.', feedBackHolder);
        } else if (status == 200) {
          showFeedback(false, 'Your profile has been updated.', feedBackHolder);
        } else if (status == 400) {
          showErrors(data, feedBackHolder);
        } else if (status == 401) {
          goToSignIn();
        } else if (status == 500) {
          showFeedback(
            true,
            'Oops! Something went wrong. Please try again later',
            feedBackHolder
          );
        }
        loader.removeLoader();
      });
    },
    changePassword: function (e) {
      e.preventDefault();
      var self = this;
      var form = e.target;
      var button = form.getElementsByClassName('submit')[0];

      var feedBackHolder = form.getElementsByClassName('feedback-holder')[0];

      if (!self.validateChangePassword(form)) {
        return;
      }

      var loader = new ButtonLoader(button);
      loader.setLoader();

      self.loadingPassword = true;
      postData('/user/password/change/', this.cpData, true, function (status, data) {
        self.loadingPassword = false;
        if (!status) {
          showFeedback(true, "Connection failed.", feedBackHolder);
        }
        else if (status == 200) {
          form.reset();
          showFeedback(false, "You have successfully changed your password", feedBackHolder);
        }
        else if (status == 400) {
          showErrors(data, feedBackHolder);
        }
        else if (status == 401) {
          goToSignIn();
        }
        else if (status == 500) {
          showFeedback(true, "Oops! Something went wrong. Please try again later", feedBackHolder);
        }
        loader.removeLoader();
      });
    },
    validateChangePassword: function (form) {
      removeErrors(form);

      valid = true;
      var error = {};
      if (this.cpData.password.trim() == "") {
        error.password = "Please enter your current password";
        valid = false;
      }

      if (!Validate.password(this.cpData.newPassword)) {
        error.newPassword = "Password must be alphanumeric and not less than 6 characters";
        valid = false;
      }

      if (this.cpData.newPassword != this.cpData.confirmPassword) {
        error.confirmPassword = "Passwords do not match";
        valid = false;
      }

      if (!valid) showErrors(error, form.getElementsByClassName('feedback-holder')[0]);

      return valid;
    },
    updateBank: function(event) {
      event.preventDefault();
      var _self = this;
      var form = event.target;

      var loader = new ButtonLoader(form.getElementsByClassName('submit')[0]);
      var feedBackHolder = form.getElementsByClassName('feedback-holder')[0];

      if (_self.profile.bank.review) {
        showFeedback(
          true,
          "We're still reviewing your last update",
          feedBackHolder
        );
        return;
      }

      if (!Validate.required(this.bank.accountName)) {
        showFeedback(true, 'Please enter a account name', feedBackHolder);
        return;
      } else if (!Validate.number(this.bank.accountNumber)) {
        showFeedback(true, 'Please enter a account number', feedBackHolder);
        return;
      } else if (!Validate.required(this.bank.bankName)) {
        showFeedback(true, 'Please enter a bank name', feedBackHolder);
        return;
      }

      loader.setLoader();

      var payload = {
        accountName: this.bank.accountName,
        accountNumber: this.bank.accountNumber,
        bankName: this.bank.bankName
      };

      postData('/user/bank', payload, true, function(status, data) {
        if (!status) {
          showFeedback(true, 'Connection failed.', feedBackHolder);
        } else if (status == 200) {
          showFeedback(
            false,
            'Your bank details are being reviewed.',
            feedBackHolder
          );
          _self.profile.bank = data.bank;
        } else if (status == 400) {
          showErrors(data, feedBackHolder);
        } else if (status == 401) {
          goToSignIn();
        } else if (status == 500) {
          showFeedback(
            true,
            'Oops! Something went wrong. Please try again later',
            feedBackHolder
          );
        }
        loader.removeLoader();
      });
    },
    popRollover: function(event, item) {
      console.log(item);
      ix.run(
        {
          type: 'click',
          selector: '.re-invest-popup',
          stepsA: [
            { display: 'flex' },
            { opacity: 1, transition: 'opacity 500ms ease-in-out 0' }
          ],
          stepsB: []
        },
        event.target
      );
    },
    closeRollover: function(event) {
      ix.run(
        {
          type: 'click',
          selector: '.re-invest-popup',
          stepsA: [
            { opacity: 0, transition: 'opacity 500ms ease-in-out 0' },
            { display: 'none' }
          ],
          stepsB: []
        },
        event.target
      );
    },
    reinvest: function(event) {
      event.preventDefault();
      var _self = this;
      var loader = new ButtonLoader(event.target);
      loader.setLoader();

      var payload = {
        item: _self.investment.code,
        price: _self.investment.price,
        units: _self.inputQuantity,
        paymentMethod: _self.paymentMethod
      };

      if (self.applyWalletFunds) payload.credit = _self.wallet.balance;

      postData('/user/invest', payload, true, function(status, data) {
        if (!status) {
          showFeedback(true, 'Connection failed.');
        } else if (status == 200) {
          if (data.investment.payment.method == 'card') {
            payWithPaystack({ investment: data.investment, loader: loader });
            return;
          }
          completedInvestment();
        } else if (status == 400) {
          showErrors(data);
        } else if (status == 401) {
          goToSignIn();
        } else if (status == 500) {
          showFeedback(
            true,
            'Oops! Something went wrong. Please try again later'
          );
        }
        loader.removeLoader();
      });
    },
    goNext: function() {
      this.calculatePayAmount();
    },
    formatAmount: function(amt) {
      return formatAmount(amt);
    },
    formatDate: function(date) {
      return formatDate(date);
    },
    setQuantity: function(operand) {
      if (operand == 'more' && this.inputQuantity < 50) this.inputQuantity++;
      if (operand == 'less' && this.inputQuantity > 1) this.inputQuantity--;
    },
    toggleApplyWalletFunds: function() {
      console.log(this.applyWalletFunds);
    },
    calculatePayAmount: function() {
      if (this.applyWalletFunds) {
        this.payAmount = this.totalCost - this.wallet.balance;
      } else {
        this.payAmount = this.totalCost;
      }
    }
  },
  computed: {
    totalCost: function() {
      return this.investment.price * this.inputQuantity;
    },
    funding: function() {
      return this.transactions.filter(function(transaction) {
        return (
          transaction.type == 'credit' &&
          transaction.category != 'payment-investment'
        );
      });
    },
    payouts: function() {
      return this.transactions.filter(function(transaction) {
        //return transaction.type == 'debit' && (transaction.category != 'payment-investment' || transaction.category != 'payout');
        return transaction.type == 'debit' && transaction.category == 'payout';
      });
    },
    lastPayout: function() {
      var payouts = this.transactions.filter(function(transaction) {
        return (
          transaction.type == 'debit' &&
          (transaction.category != 'payment-investment' ||
            transaction.category != 'payout')
        );
      });
      if (!Array.isArray(payouts) && payouts.length > 1) {
        return this.formatDate(payouts[0].date);
      } else { 
        return 'No payouts yet';
      }
    },
    redeemedReferrals: function() {
      return this.referrals.filter(function(referral) {
        return referral.amount;
      });
    },
    pendingReferrals: function() {
      return this.referrals.filter(function(referral) {
        return !referral.amount;
      });
    }
  },
  filters: {
    uppercase: function (val) {
      return val && typeof val === 'string' ? val.toUpperCase() : val;
    },
    firstChar: function (val) {
      return val && typeof val === 'string' ? val.split(' ')[0] : val;
    }
  },
  watch: {
    wallet: function(wallet) {
      if (wallet.balance > 0) this.applyWalletFunds = true;
    }
  },
  mounted: function() {}
});
