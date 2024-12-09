<?php
$user_id = get_current_user_id();

if (!$user_id) {
    return; // No logged-in user
}

// Retrieve saved payment tokens
$tokens = WC_Payment_Tokens::get_customer_tokens($user_id);

if (empty($tokens)) {
  return;
}
$default_payment = null;

?>
<div class="saved-payment-methods">
  
    <div class="payment-methods-list">

  
    <?php
    foreach ($tokens as $token) {
      $card_type = $token->get_card_type();
      $last4 = $token->get_last4();
      $expiry = $token->get_expiry_month() . '/' . $token->get_expiry_year();
      $token_id = $token->get_id();
      $is_default = $token->is_default();
      $tokenValue = $token->get_token();
      if ($is_default) {
        $default_payment = $token;
      }
      $card_image = CYNDER_PAYMONGO_PLUGIN_URL . '/assets/images/card_other.png';
      if ($card_type === "mastercard") {
        $card_image = CYNDER_PAYMONGO_PLUGIN_URL . '/assets/images/card_mastercard.png';
      }
      if ($card_type === "visa") {
        $card_image = CYNDER_PAYMONGO_PLUGIN_URL . '/assets/images/card_visa.png';
      }
      // Display each token as a radio button
      echo sprintf(
          '<span class="paymongo-saved-payment-method"><input id="wc_saved_payment_method_%d" type="radio" name="wc_saved_payment_method" value="%s" %s /><label for="wc_saved_payment_method_%d"><img src="%s" class="card-type"> %s %s</label></span>',
          esc_attr($token_id),
          esc_attr($tokenValue),
          $is_default ? "checked" : "",
          esc_attr($token_id),
          $card_image,
          ucfirst($card_type),
          $last4

      );
    }
    echo sprintf(
        '<span class="paymongo-saved-payment-method"><input id="wc_saved_payment_method_new" type="radio" name="wc_saved_payment_method" value="%s" %s /><label for="wc_saved_payment_method_new">Add new payment method</label></span>',
        esc_attr("new"),
        $default_payment == null ? "checked" : ""
    );
    ?>
  </div>
</div>