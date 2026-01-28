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
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('WBRP_VERSION', '1.0.0');
define('WBRP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WBRP_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Add admin menu
 */
add_action('admin_menu', 'wbrp_add_admin_menu');

function wbrp_add_admin_menu() {
    // add_menu_page returns the "hook suffix" - a unique identifier for this page
    // We need this to load our scripts ONLY on this page
    $hook = add_menu_page(
        'Blog Repurpose',           // Page title
        'Blog Repurpose',           // Menu title
        'manage_options',           // Capability required
        'blog-repurpose',           // Menu slug
        'wbrp_render_admin_page',   // Callback function
        'dashicons-edit-large',     // Icon
        30                          // Position
    );

    // Load our React scripts only on this specific admin page
    // This is important for performance - we don't want to load React on every WP admin page!
    add_action("admin_enqueue_scripts", function($current_hook) use ($hook) {
        // Only load on our page
        if ($current_hook !== $hook) {
            return;
        }

        // Load our built React app
        // The build process creates index.js and index.css in /build folder
        $asset_file = WBRP_PLUGIN_DIR . 'build/index.asset.php';

        // Check if build exists
        if (!file_exists($asset_file)) {
            // Build doesn't exist yet - show helpful message
            add_action('admin_notices', function() {
                echo '<div class="notice notice-warning"><p>';
                echo '<strong>Blog Repurpose Plugin:</strong> React app not built yet. ';
                echo 'Run <code>npm install && npm run build</code> in the plugin folder.';
                echo '</p></div>';
            });
            return;
        }

        // Load the asset file - it contains dependencies and version
        $assets = include($asset_file);

        // Enqueue the JavaScript
        // wp_enqueue_script(handle, src, dependencies, version, in_footer)
        wp_enqueue_script(
            'wbrp-admin',                           // Unique handle
            WBRP_PLUGIN_URL . 'build/index.js',     // URL to the script
            $assets['dependencies'],                 // WordPress will auto-load React, etc.
            $assets['version'],                      // Version for cache busting
            true                                     // Load in footer
        );

        // Enqueue the CSS
        wp_enqueue_style(
            'wbrp-admin',
            WBRP_PLUGIN_URL . 'build/index.css',
            [],
            $assets['version']
        );

        // Also load WordPress components CSS (for the Button, TextareaControl, etc.)
        wp_enqueue_style('wp-components');
    });
}

/**
 * Render the admin page
 * This just creates the container - React takes over from here
 */
function wbrp_render_admin_page() {
    ?>
    <div class="wrap">
        <!-- React app mounts here -->
        <div id="wbrp-app">
            <!-- If you see this, React hasn't loaded yet -->
            <p>Loading...</p>
        </div>
    </div>
    <?php
}
