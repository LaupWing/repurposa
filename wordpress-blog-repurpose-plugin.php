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

        // Pass config to React (Sanctum token + Laravel API URL)
        wp_localize_script('wbrp-admin', 'wbrpConfig', [
            'apiUrl' => defined('WBRP_API_URL') ? WBRP_API_URL : 'http://127.0.0.1:8000',
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

    // Blog routes
    register_rest_route('wbrp/v1', '/blogs', [
        [
            'methods' => 'GET',
            'callback' => 'wbrp_get_blogs',
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
        [
            'methods' => 'POST',
            'callback' => 'wbrp_create_blog',
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
    ]);

    // Single blog route
    register_rest_route('wbrp/v1', '/blogs/(?P<id>\d+)', [
        [
            'methods' => 'GET',
            'callback' => 'wbrp_get_blog',
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
        [
            'methods' => 'PUT',
            'callback' => 'wbrp_update_blog',
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
        [
            'methods' => 'DELETE',
            'callback' => 'wbrp_delete_blog',
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
    ]);

    // Publish route
    register_rest_route('wbrp/v1', '/blogs/(?P<id>\d+)/publish', [
        [
            'methods' => 'POST',
            'callback' => 'wbrp_publish_blog',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ],
    ]);

    // Tweet routes (by blog)
    register_rest_route('wbrp/v1', '/blogs/(?P<blog_id>\d+)/tweets', [
        [
            'methods' => 'GET',
            'callback' => 'wbrp_get_tweets',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ],
        [
            'methods' => 'POST',
            'callback' => 'wbrp_save_tweets',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ],
        [
            'methods' => 'DELETE',
            'callback' => 'wbrp_delete_tweets',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ],
    ]);
}

/**
 * Get all blogs
 */
function wbrp_get_blogs() {
    $posts = get_posts([
        'post_type' => 'wbrp_blog',
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'DESC',
    ]);

    $blogs = array_map(function($post) {
        $published_post_id = get_post_meta($post->ID, '_wbrp_published_post_id', true);
        return [
            'id' => $post->ID,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'status' => get_post_meta($post->ID, '_wbrp_status', true) ?: 'draft',
            'topic' => get_post_meta($post->ID, '_wbrp_topic', true),
            'outline' => get_post_meta($post->ID, '_wbrp_outline', true),
            'thumbnail' => get_post_meta($post->ID, '_wbrp_thumbnail', true),
            'published_post_id' => $published_post_id ? (int) $published_post_id : null,
            'published_post_url' => $published_post_id ? get_permalink($published_post_id) : null,
            'created_at' => $post->post_date,
            'updated_at' => $post->post_modified,
        ];
    }, $posts);

    return new WP_REST_Response(['blogs' => $blogs], 200);
}

/**
 * Get single blog
 */
function wbrp_get_blog(WP_REST_Request $request) {
    $post_id = $request->get_param('id');
    $post = get_post($post_id);

    if (!$post || $post->post_type !== 'wbrp_blog') {
        return new WP_REST_Response(['error' => 'Blog not found'], 404);
    }

    $published_post_id = get_post_meta($post->ID, '_wbrp_published_post_id', true);
    $blog = [
        'id' => $post->ID,
        'title' => $post->post_title,
        'content' => $post->post_content,
        'status' => get_post_meta($post->ID, '_wbrp_status', true) ?: 'draft',
        'topic' => get_post_meta($post->ID, '_wbrp_topic', true),
        'outline' => get_post_meta($post->ID, '_wbrp_outline', true),
        'thumbnail' => get_post_meta($post->ID, '_wbrp_thumbnail', true),
        'published_post_id' => $published_post_id ? (int) $published_post_id : null,
        'published_post_url' => $published_post_id ? get_permalink($published_post_id) : null,
        'created_at' => $post->post_date,
        'updated_at' => $post->post_modified,
    ];

    return new WP_REST_Response(['blog' => $blog], 200);
}

/**
 * Create a new blog
 */
function wbrp_create_blog(WP_REST_Request $request) {
    $data = $request->get_json_params();

    $post_id = wp_insert_post([
        'post_type' => 'wbrp_blog',
        'post_title' => sanitize_text_field($data['title'] ?? ''),
        'post_content' => wp_kses_post($data['content'] ?? ''),
        'post_status' => 'publish', // Internal status, actual status in meta
    ]);

    if (is_wp_error($post_id)) {
        return new WP_REST_Response(['error' => $post_id->get_error_message()], 500);
    }

    // Save metadata
    update_post_meta($post_id, '_wbrp_status', 'draft');
    update_post_meta($post_id, '_wbrp_topic', sanitize_text_field($data['topic'] ?? ''));

    if (!empty($data['outline'])) {
        update_post_meta($post_id, '_wbrp_outline', $data['outline']);
    }

    return new WP_REST_Response([
        'blog' => [
            'id' => $post_id,
            'title' => get_the_title($post_id),
            'status' => 'draft',
        ],
        'success' => true,
    ], 201);
}

/**
 * Update a blog
 */
function wbrp_update_blog(WP_REST_Request $request) {
    $post_id = $request->get_param('id');
    $post = get_post($post_id);

    if (!$post || $post->post_type !== 'wbrp_blog') {
        return new WP_REST_Response(['error' => 'Blog not found'], 404);
    }

    $data = $request->get_json_params();

    // Update post
    $update_args = ['ID' => $post_id];

    if (isset($data['title'])) {
        $update_args['post_title'] = sanitize_text_field($data['title']);
    }

    if (isset($data['content'])) {
        $update_args['post_content'] = wp_kses_post($data['content']);
    }

    wp_update_post($update_args);

    // Update meta
    if (isset($data['thumbnail'])) {
        update_post_meta($post_id, '_wbrp_thumbnail', esc_url_raw($data['thumbnail']));
    }

    if (isset($data['status'])) {
        update_post_meta($post_id, '_wbrp_status', sanitize_text_field($data['status']));
    }

    return new WP_REST_Response(['success' => true], 200);
}

/**
 * Delete a blog
 */
function wbrp_delete_blog(WP_REST_Request $request) {
    $post_id = $request->get_param('id');
    $post = get_post($post_id);

    if (!$post || $post->post_type !== 'wbrp_blog') {
        return new WP_REST_Response(['error' => 'Blog not found'], 404);
    }

    wp_delete_post($post_id, true);

    return new WP_REST_Response(['success' => true], 200);
}

/**
 * Publish a blog as a real WordPress post
 */
function wbrp_publish_blog(WP_REST_Request $request) {
    $blog_id = $request->get_param('id');
    $blog = get_post($blog_id);

    if (!$blog || $blog->post_type !== 'wbrp_blog') {
        return new WP_REST_Response(['error' => 'Blog not found'], 404);
    }

    // Check if already published
    $existing_post_id = get_post_meta($blog_id, '_wbrp_published_post_id', true);
    if ($existing_post_id && get_post($existing_post_id)) {
        // Update the existing post instead
        wp_update_post([
            'ID' => $existing_post_id,
            'post_title' => $blog->post_title,
            'post_content' => $blog->post_content,
        ]);

        return new WP_REST_Response([
            'success' => true,
            'post_id' => (int) $existing_post_id,
            'post_url' => get_permalink($existing_post_id),
            'updated' => true,
        ], 200);
    }

    // Create a real WordPress post
    $post_id = wp_insert_post([
        'post_type' => 'post',
        'post_title' => $blog->post_title,
        'post_content' => $blog->post_content,
        'post_status' => 'publish',
    ]);

    if (is_wp_error($post_id)) {
        return new WP_REST_Response(['error' => $post_id->get_error_message()], 500);
    }

    // Store the connection
    update_post_meta($blog_id, '_wbrp_published_post_id', $post_id);
    update_post_meta($blog_id, '_wbrp_status', 'published');

    return new WP_REST_Response([
        'success' => true,
        'post_id' => $post_id,
        'post_url' => get_permalink($post_id),
        'updated' => false,
    ], 201);
}

/**
 * Get tweets for a blog
 */
function wbrp_get_tweets(WP_REST_Request $request) {
    $blog_id = $request->get_param('blog_id');
    $blog = get_post($blog_id);

    if (!$blog || $blog->post_type !== 'wbrp_blog') {
        return new WP_REST_Response(['error' => 'Blog not found'], 404);
    }

    $posts = get_posts([
        'post_type' => 'wbrp_tweet',
        'post_parent' => $blog_id,
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'ASC',
    ]);

    $tweets = array_map(function ($post) {
        return [
            'id' => $post->ID,
            'content' => $post->post_content,
            'inspiration_id' => get_post_meta($post->ID, '_wbrp_inspiration_id', true),
            'inspiration_content' => get_post_meta($post->ID, '_wbrp_inspiration_content', true),
            'inspiration_hook' => get_post_meta($post->ID, '_wbrp_inspiration_hook', true),
            'emotions' => json_decode(get_post_meta($post->ID, '_wbrp_emotions', true), true) ?: [],
            'structure' => get_post_meta($post->ID, '_wbrp_structure', true),
            'why_it_works' => get_post_meta($post->ID, '_wbrp_why_it_works', true),
            'cta_tweet' => get_post_meta($post->ID, '_wbrp_cta_tweet', true) ?: null,
        ];
    }, $posts);

    return new WP_REST_Response(['tweets' => $tweets], 200);
}

/**
 * Save tweets for a blog (replaces existing)
 */
function wbrp_save_tweets(WP_REST_Request $request) {
    $blog_id = $request->get_param('blog_id');
    $blog = get_post($blog_id);

    if (!$blog || $blog->post_type !== 'wbrp_blog') {
        return new WP_REST_Response(['error' => 'Blog not found'], 404);
    }

    $data = $request->get_json_params();
    $tweets = $data['tweets'] ?? [];

    // Delete existing tweets for this blog
    $existing = get_posts([
        'post_type' => 'wbrp_tweet',
        'post_parent' => $blog_id,
        'posts_per_page' => -1,
        'fields' => 'ids',
    ]);
    foreach ($existing as $tweet_id) {
        wp_delete_post($tweet_id, true);
    }

    // Insert new tweets
    $saved = [];
    foreach ($tweets as $tweet) {
        $post_id = wp_insert_post([
            'post_type' => 'wbrp_tweet',
            'post_content' => wp_kses_post($tweet['content'] ?? ''),
            'post_parent' => $blog_id,
            'post_status' => 'publish',
        ]);

        if (!is_wp_error($post_id)) {
            update_post_meta($post_id, '_wbrp_inspiration_id', intval($tweet['inspiration_id'] ?? 0));
            update_post_meta($post_id, '_wbrp_inspiration_content', wp_kses_post($tweet['inspiration_content'] ?? ''));
            update_post_meta($post_id, '_wbrp_inspiration_hook', sanitize_text_field($tweet['inspiration_hook'] ?? ''));
            update_post_meta($post_id, '_wbrp_emotions', wp_json_encode($tweet['emotions'] ?? []));
            update_post_meta($post_id, '_wbrp_structure', sanitize_text_field($tweet['structure'] ?? ''));
            update_post_meta($post_id, '_wbrp_why_it_works', sanitize_text_field($tweet['why_it_works'] ?? ''));

            if (!empty($tweet['cta_tweet'])) {
                update_post_meta($post_id, '_wbrp_cta_tweet', wp_kses_post($tweet['cta_tweet']));
            }

            $saved[] = ['id' => $post_id];
        }
    }

    return new WP_REST_Response(['saved' => $saved, 'success' => true], 201);
}

/**
 * Delete all tweets for a blog
 */
function wbrp_delete_tweets(WP_REST_Request $request) {
    $blog_id = $request->get_param('blog_id');
    $blog = get_post($blog_id);

    if (!$blog || $blog->post_type !== 'wbrp_blog') {
        return new WP_REST_Response(['error' => 'Blog not found'], 404);
    }

    $existing = get_posts([
        'post_type' => 'wbrp_tweet',
        'post_parent' => $blog_id,
        'posts_per_page' => -1,
        'fields' => 'ids',
    ]);
    foreach ($existing as $tweet_id) {
        wp_delete_post($tweet_id, true);
    }

    return new WP_REST_Response(['success' => true], 200);
}
