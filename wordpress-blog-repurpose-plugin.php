<?php
/**
 * Plugin Name: WordPress Blog Repurpose Plugin
 * Description: Create blog posts with AI and repurpose them into tweets using proven viral patterns.
 * Version: 1.0.0
 * Author: Loc Nguyen
 * License: GPL v2 or later
 * Text Domain: wordpress-blog-repurpose-plugin
 */

// Prevent direct access to this file
// Why? If someone visits this PHP file directly in browser, we don't want it to run
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants - these help us reference paths easily throughout the plugin
define('WBRP_VERSION', '1.0.0');
define('WBRP_PLUGIN_DIR', plugin_dir_path(__FILE__));  // Full server path to plugin folder
define('WBRP_PLUGIN_URL', plugin_dir_url(__FILE__));   // URL to plugin folder (for assets)

/**
 * For now, let's just add a simple admin menu to prove the plugin works
 */
add_action('admin_menu', 'wbrp_add_admin_menu');

function wbrp_add_admin_menu() {
    // This creates a top-level menu item in WordPress admin sidebar
    add_menu_page(
        'Blog Repurpose',           // Page title (shown in browser tab)
        'Blog Repurpose',           // Menu title (shown in sidebar)
        'manage_options',           // Capability required (admin only)
        'blog-repurpose',           // Menu slug (URL identifier)
        'wbrp_render_admin_page',   // Callback function to render the page
        'dashicons-edit-large',     // Icon (WordPress built-in dashicon)
        30                          // Position in menu (lower = higher up)
    );
}

function wbrp_render_admin_page() {
    // This is where our React app will mount later
    // For now, just a simple container
    ?>
    <div class="wrap">
        <h1>Blog Repurpose</h1>
        <p>Plugin is working! React app will load here.</p>
        <div id="wbrp-app">
            <!-- React will mount here -->
        </div>
    </div>
    <?php
}
