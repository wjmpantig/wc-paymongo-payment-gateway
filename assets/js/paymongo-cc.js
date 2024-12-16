jQuery(document).ready(function ($) {
    function CCForm() {
        this.form = null;
        this.method_field_name = 'cynder_paymongo_method_id';
        this.method_field_selector = 'input#' + this.method_field_name;
        this.is_new_card = false
        this.init();
        this.card_type = null;
    }

    CCForm.prototype.set = function(key, value) {
        this[key] = value;
    }

    CCForm.prototype.get = function(key) {
        return this[key];
    }

    CCForm.prototype.init = function () {
        $(document.body).on('payment_method_selected', this.initializeCcFields.bind(this));
        $(document.body).on('updated_checkout', this.initializeCcFields.bind(this));
        
        let form;
        
        if(cynder_paymongo_cc_params.isCheckout) {
            form = $('form.woocommerce-checkout');
            form.on(
                'checkout_place_order_paymongo',
                this.onSubmit.bind(this)
            );
            this.form = form;
            $(document.body).trigger('cynder_paymongo_init_checkout_form', [form]);
        } else if (cynder_paymongo_cc_params.isOrderPay) {
            form = $('#order_review');
            form.on('submit', this.onSubmit.bind(this));
            this.form = form;
            $(document.body).trigger('cynder_paymongo_init_checkout_form', [form]);
        } else if (cynder_paymongo_cc_params.isAddPaymentMethodPage) {
            form = $('#add_payment_method');
            form.on('submit', this.onSubmit.bind(this));
            $(document.body).trigger('payment_method_selected');

            this.form = form;
        } else {
            alert('Paymongo cannot find the checkout form. Initialization failed. Try to refresh the page.');
        }
    }

    CCForm.prototype.initializeCcFields = function () {
        var paymentMethod = $('input[name=payment_method]:checked').val();
        
        /** If payment method is not CC, don't initialize form */
        if (paymentMethod !== 'paymongo') return;
        this.addLoader();
        setTimeout(function () {
            this.initCleave();
        }.bind(this), 500);
        const { isCheckout, isOrderPay } = cynder_paymongo_cc_params
        if (isCheckout || isOrderPay) {
            $('input[name="wc_saved_payment_method"]').on('change', (e) => {
                const { value } = e.target
                if (value === 'new') {
                    $('.new-card-fields').slideDown();
                    return
                }
                $('.new-card-fields').slideUp();

            })
            $('input[name="wc_saved_payment_method"]:checked').trigger('change')
        }
    }

    CCForm.prototype.initCleave = function () {
        if ($("#paymongo_ccNo").length) {
            var ccNo = new Cleave("#paymongo_ccNo", {
                creditCard: true,
            });
        }

        if ($("#paymongo_expdate").length) {
            var expDate = new Cleave("#paymongo_expdate", {
                date: true,
                datePattern: ["m", "y"],
            });
        }

        if ($("#paymongo_cvv").length) {
            var cvv = new Cleave("#paymongo_cvv", {
                blocks: [4],
            });
        }

        this.removeLoader();
    };

    CCForm.prototype.onSubmit = function (e) {
        const form = this.form;
        this.card_type = null;

        var paymentMethod = $('input[name=payment_method]:checked').val();

        if (paymentMethod !== 'paymongo') {
            return form.submit();
        }

        const hasMethod = form.find(this.method_field_selector).length;
        if (hasMethod) {
            this.removeLoader();
            return true;
        }

        e.preventDefault();
        // if (cynder_paymongo_cc_params.isOrderPay || cynder_paymongo_cc_params.isAddPaymentMethodPage) {
        // }
        const paymentMethodId = $('input[name="wc_saved_payment_method"]:checked').val()
        if (paymentMethodId === 'new' || typeof paymentMethodId === 'undefined' ) {
            this.is_new_card = true
            return this.createPaymentMethod();
        }

        // payment method selected
        // this.onPaymentMethodCreationResponse(null, {
        //     id: paymentMethodId
        // })
        const args = [
            paymentMethodId,
            this.onPaymentMethodCreationResponse.bind(this),
        ];
        $(document.body).trigger('cynder_paymongo_get_payment_method', args);


    }

    CCForm.prototype.createPaymentMethod = function () {
        const ccNo = $("#paymongo_ccNo").val();
        const [expMonth, expYear] = $("#paymongo_expdate").val().split("/");
        const cvc = $("#paymongo_cvv").val();

        const line1 =
            cynder_paymongo_cc_params.billing_address_1 ||
            $("#billing_address_1").val();
        const line2 =
            cynder_paymongo_cc_params.billing_address_2 ||
            $("#billing_address_2").val();
        const city =
            cynder_paymongo_cc_params.billing_city || $("#billing_city").val();
        const state =
            cynder_paymongo_cc_params.billing_state || $("#billing_state").val();
        const country =
            cynder_paymongo_cc_params.billing_country || $("#billing_country").val();
        const postal_code =
            cynder_paymongo_cc_params.billing_postcode ||
            $("#billing_postcode").val();
        const name = this.getName();
        const email =
            cynder_paymongo_cc_params.billing_email || $("#billing_email").val();
        const phone =
            cynder_paymongo_cc_params.billing_phone || $("#billing_phone").val();

        const payload = {
            type: "card",
            details: {
                card_number: ccNo.replace(/ /g, ""),
                exp_month: parseInt(expMonth),
                exp_year: parseInt(expYear),
                cvc: cvc,
            },
            billing: {
                address: {
                    line1: line1,
                    line2: line2,
                    city: city,
                    state: state,
                    country: country,
                    postal_code: postal_code,
                },
                name: name,
                email: email,
                phone: phone,
            },
        };
        this.card_type = this.detectCardType(ccNo)
        var args = [
            payload,
            this.onPaymentMethodCreationResponse.bind(this),
        ];

        this.addLoader();

        $(document.body).trigger('cynder_paymongo_create_payment_method', args);

        return false;
    }

    CCForm.prototype.getName = function () {
        const firstName =
            cynder_paymongo_cc_params.billing_first_name ||
            $("#billing_first_name").val();
        const lastName =
            cynder_paymongo_cc_params.billing_last_name ||
            $("#billing_last_name").val();

        let name = firstName + " " + lastName;
        let companyName =
            cynder_paymongo_cc_params.billing_company || $("#billing_company").val();

        if (companyName && companyName.length) {
            name = name + " - " + companyName;
        }

        return name;
    }

    CCForm.prototype.onPaymentMethodCreationResponse = function (err, data) {
        this.removeLoader();
        // debugger
        if (err) {
            // TODO errors not loading on add payment method page
            return this.showClientErrors(err.errors);
        }

        var form = this.form;
 
        let methodField = form.find(this.method_field_selector);        
        const hasMethod = methodField.length;

        if (!hasMethod) {
            form.append('<input type="hidden" id="' + this.method_field_name + '" name="' + this.method_field_name + '"/>');
            methodField = form.find(this.method_field_selector);
        }
        
        const payment_method_id = data.id;
        methodField.val(payment_method_id);
        
        const is_new_card = this.is_new_card;
        
        if (cynder_paymongo_cc_params.isAddPaymentMethodPage || is_new_card) {
            const details = data.attributes.details;
            Object.entries(details).forEach(([k,v]) => {
                const field = $('<input type="hidden" id="' + k + '" name="' + k+ '"/>');
                form.append(field)
                field.val(v)
            })
            const field = $('<input type="hidden" id="card_type" name="card_type"/>');
            field.val(this.card_type)
            form.append(field)
            if (is_new_card) {
                const field = $('<input type="hidden" id="is_new_card" name="is_new_card" value="true" />');
                form.append(field)
            }
        }
        form.submit();
    }

    CCForm.prototype.showClientErrors = function (errors) {
        const args = [
            errors,
            this.onClientErrorParsed.bind(this),
        ];

        $(document.body).trigger('cynder_paymongo_parse_client_errors', args);
    }

    CCForm.prototype.onClientErrorParsed = function (errorMessages) {
        const errorHtml = errorMessages.reduce((html, errorMessage, index) => {
            let newHtml = html + '<li>' + errorMessage + '</li>';

            if (index === (errorMessages.length - 1)) {
                newHtml = newHtml + '</ul>';
            }

            return newHtml;
        }, '<ul class="woocommerce-error">');

        return $(document.body).trigger('cynder_paymongo_show_errors', [errorHtml]);
    }

    CCForm.prototype.addLoader = function () {
        $(".wc_payment_method > .payment_box").append(
            '<div class="paymongo-loading"><div class="paymongo-roller"><div /><div /><div /><div /><div /><div /><div /><div /></div></div>'
        );
    }

    CCForm.prototype.removeLoader = function () {
        $(".paymongo-loading").remove();
    }

    CCForm.prototype.detectCardType = function (cardNumber) {
        // Remove spaces or dashes from the card number
        cardNumber = cardNumber.replace(/\D/g, '');
    
        // Define card type patterns
        const cardPatterns = {
            visa: /^4[0-9]{12}(?:[0-9]{3})?(?:[0-9]{3})?$/, // Starts with 4
            mastercard: /^(?:5[1-5][0-9]{14}|2(?:2[2-9][0-9]{12}|[3-7][0-9]{13}))$/, // 51-55 or 2221-2720
            amex: /^3[47][0-9]{13}$/, // Starts with 34 or 37
            discover: /^(?:6011|65|64[4-9]|622(?:12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[01][0-9]|92[0-5]))[0-9]{12}$/, // Discover
            jcb: /^(?:2131|1800|35\d{3})\d{11}$/, // Starts with 2131, 1800, or 35
            diners: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/ // Diners Club: 300-305, 36, or 38
        };
    
        // Check the card number against each pattern
        for (const [cardType, pattern] of Object.entries(cardPatterns)) {
            if (pattern.test(cardNumber)) {
                return cardType; // Return the detected card type (e.g., "visa", "mastercard")
            }
        }
    
        return 'unknown'; // Return 'unknown' if no match
    }

    new CCForm();
});