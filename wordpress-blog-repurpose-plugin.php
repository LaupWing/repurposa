<?php
/**
 * Plugin Name: WordPress Blog Repurpose Plugin
 * Description: Create blog posts with AI and repurpose them into tweets using proven viral patterns.
 * Version: 1.0.0
 * Author: Loc Nguyen
 * License: GPL v2 or later
 * Text Domain: wordpress-blog-repurpose-plugin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('WBRP_VERSION', '1.0.0');
define('WBRP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WBRP_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Add admin menu with submenus
 */
add_action('admin_menu', 'wbrp_add_admin_menu');

function wbrp_add_admin_menu() {
    // Main menu page (also serves as "Create Blog")
    $main_hook = add_menu_page(
        'Blog Repurpose',
        'Blog Repurpose',
        'manage_options',
        'blog-repurpose',
        'wbrp_render_page_create',
        'dashicons-edit-large',
        30
    );

    // Submenu: Create Blog (same as main, but explicit in submenu)
    $create_hook = add_submenu_page(
        'blog-repurpose',           // Parent slug
        'Create Blog',              // Page title
        'Create Blog',              // Menu title
        'manage_options',           // Capability
        'blog-repurpose',           // Menu slug (same as parent = replaces "Blog Repurpose" text)
        'wbrp_render_page_create'   // Callback
    );

    // Submenu: Blogs
    $blogs_hook = add_submenu_page(
        'blog-repurpose',
        'Blogs',
        'Blogs',
        'manage_options',
        'blog-repurpose-blogs',
        'wbrp_render_page_blogs'
    );

    // Submenu: Schedule
    $schedule_hook = add_submenu_page(
        'blog-repurpose',
        'Schedule',
        'Schedule',
        'manage_options',
        'blog-repurpose-schedule',
        'wbrp_render_page_schedule'
    );

    // Submenu: Connections
    $connections_hook = add_submenu_page(
        'blog-repurpose',
        'Connections',
        'Connections',
        'manage_options',
        'blog-repurpose-connections',
        'wbrp_render_page_connections'
    );

    // Collect all hooks to load scripts on any of our pages
    $all_hooks = [$main_hook, $create_hook, $blogs_hook, $schedule_hook, $connections_hook];

    // Load scripts on all our pages
    add_action('admin_enqueue_scripts', function($current_hook) use ($all_hooks) {
        if (!in_array($current_hook, $all_hooks)) {
            return;
        }

        $asset_file = WBRP_PLUGIN_DIR . 'build/index.asset.php';

        if (!file_exists($asset_file)) {
            return;
        }

        $assets = include($asset_file);

        wp_enqueue_script(
            'wbrp-admin',
            WBRP_PLUGIN_URL . 'build/index.js',
            $assets['dependencies'],
            $assets['version'],
            true
        );

        wp_enqueue_style(
            'wbrp-admin',
            WBRP_PLUGIN_URL . 'build/index.css',
            [],
            $assets['version']
        );

        wp_enqueue_style('wp-components');
    });
}

/**
 * Render pages - each passes the page type to React via data attribute
 */
function wbrp_render_page_create() {
    wbrp_render_app('create');
}

function wbrp_render_page_blogs() {
    // Check if viewing a specific blog
    if (isset($_GET['post_id'])) {
        wbrp_render_app('blog-view', intval($_GET['post_id']));
    } else {
        wbrp_render_app('blogs');
    }
}

function wbrp_render_page_schedule() {
    wbrp_render_app('schedule');
}

function wbrp_render_page_connections() {
    wbrp_render_app('connections');
}

/**
 * Render the React app container with page type
 */
function wbrp_render_app($page, $post_id = null) {
    ?>
    <div class="wrap">
        <div id="wbrp-app"
             data-page="<?php echo esc_attr($page); ?>"
             <?php if ($post_id): ?>data-post-id="<?php echo esc_attr($post_id); ?>"<?php endif; ?>>
            <p>Loading...</p>
        </div>
    </div>
    <?php
}
