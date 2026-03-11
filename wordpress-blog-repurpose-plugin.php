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

    // Submenu: Analytics
    $analytics_hook = add_submenu_page(
        'blog-repurpose',
        'Analytics',
        'Analytics',
        'manage_options',
        'blog-repurpose-analytics',
        'wbrp_render_page_analytics'
    );

    // Submenu: Settings
    $connections_hook = add_submenu_page(
        'blog-repurpose',
        'Settings',
        'Settings',
        'manage_options',
        'blog-repurpose-settings',
        'wbrp_render_page_settings'
    );

    // Collect all hooks to load scripts on any of our pages
    $all_hooks = [$main_hook, $create_hook, $blogs_hook, $schedule_hook, $analytics_hook, $connections_hook];

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

        // Pass config to React (Sanctum token + Laravel API URL)
        wp_localize_script('wbrp-admin', 'wbrpConfig', [
            'apiUrl' => defined('WBRP_API_URL') ? WBRP_API_URL : 'https://ai-blog-tool.test',
            'token' => get_option('wbrp_auth_token', ''),
        ]);

        // Enqueue WordPress media library
        wp_enqueue_media();
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

function wbrp_render_page_analytics() {
    wbrp_render_app('analytics');
}

function wbrp_render_page_settings() {
    wbrp_render_app('settings');
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


/**
 * Register REST API routes
 */
add_action('rest_api_init', 'wbrp_register_rest_routes');

function wbrp_register_rest_routes() {
    // Auth token route — stores/retrieves the Sanctum token
    register_rest_route('wbrp/v1', '/auth/token', [
        [
            'methods' => 'GET',
            'callback' => function() {
                $token = get_option('wbrp_auth_token', '');
                return new WP_REST_Response(['token' => $token], 200);
            },
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
        [
            'methods' => 'POST',
            'callback' => function(WP_REST_Request $request) {
                $data = $request->get_json_params();
                $token = sanitize_text_field($data['token'] ?? '');

                if (empty($token)) {
                    return new WP_REST_Response(['error' => 'Token is required'], 400);
                }

                update_option('wbrp_auth_token', $token);
                return new WP_REST_Response(['success' => true], 200);
            },
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
        [
            'methods' => 'DELETE',
            'callback' => function() {
                delete_option('wbrp_auth_token');
                return new WP_REST_Response(['success' => true], 200);
            },
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
    ]);

    // Publish route — creates/updates a real WordPress post from Laravel data
    register_rest_route('wbrp/v1', '/blogs/(?P<id>\d+)/publish', [
        [
            'methods' => 'POST',
            'callback' => 'wbrp_publish_blog',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ],
    ]);
}

/**
 * Publish a blog as a real WordPress post.
 * Receives { title, content, thumbnail } directly from the frontend.
 * The id param is the Laravel post ID, stored as meta for tracking.
 */
function wbrp_publish_blog(WP_REST_Request $request) {
    $laravel_id = $request->get_param('id');
    $data = $request->get_json_params();

    $title = sanitize_text_field($data['title'] ?? '');
    $content = wp_kses_post($data['content'] ?? '');
    $thumbnail = esc_url_raw($data['thumbnail'] ?? '');

    if (empty($title) && empty($content)) {
        return new WP_REST_Response(['error' => 'Title or content is required'], 400);
    }

    // Check if we already published this Laravel post
    $existing_posts = get_posts([
        'post_type' => 'post',
        'meta_key' => '_wbrp_laravel_id',
        'meta_value' => $laravel_id,
        'posts_per_page' => 1,
        'post_status' => 'any',
    ]);

    if (!empty($existing_posts)) {
        // Update the existing WordPress post
        $wp_post_id = $existing_posts[0]->ID;
        wp_update_post([
            'ID' => $wp_post_id,
            'post_title' => $title,
            'post_content' => $content,
        ]);

        if (!empty($thumbnail)) {
            wbrp_set_featured_image($wp_post_id, $thumbnail);
        }

        return new WP_REST_Response([
            'success' => true,
            'post_id' => $wp_post_id,
            'post_url' => get_permalink($wp_post_id),
            'updated' => true,
        ], 200);
    }

    // Create a new WordPress post
    $wp_post_id = wp_insert_post([
        'post_type' => 'post',
        'post_title' => $title,
        'post_content' => $content,
        'post_status' => 'publish',
    ]);

    if (is_wp_error($wp_post_id)) {
        return new WP_REST_Response(['error' => $wp_post_id->get_error_message()], 500);
    }

    // Store the Laravel ID for future syncing
    update_post_meta($wp_post_id, '_wbrp_laravel_id', $laravel_id);

    if (!empty($thumbnail)) {
        wbrp_set_featured_image($wp_post_id, $thumbnail);
    }

    return new WP_REST_Response([
        'success' => true,
        'post_id' => $wp_post_id,
        'post_url' => get_permalink($wp_post_id),
        'updated' => false,
    ], 201);
}

/**
 * Download an image from a URL and set it as the featured image for a post.
 */
function wbrp_set_featured_image($post_id, $image_url) {
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    // Check if this image is already in the media library (by URL)
    $existing_id = attachment_url_to_postid($image_url);
    if ($existing_id) {
        set_post_thumbnail($post_id, $existing_id);
        return;
    }

    // Download and sideload the image into the media library
    $tmp = download_url($image_url);
    if (is_wp_error($tmp)) {
        return;
    }

    $filename = basename(parse_url($image_url, PHP_URL_PATH));
    if (empty($filename)) {
        $filename = 'featured-' . $post_id . '.jpg';
    }

    $file_array = [
        'name'     => $filename,
        'tmp_name' => $tmp,
    ];

    $attachment_id = media_handle_sideload($file_array, $post_id);

    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
        return;
    }

    set_post_thumbnail($post_id, $attachment_id);
}

