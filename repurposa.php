<?php
/**
 * Plugin Name: Repurposa
 * Description: Create blog posts with AI and repurpose them into social media content.
 * Version: 1.0.56
 * Author: Loc Nguyen
 * License: GPL v2 or later
 * Text Domain: repurposa
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Auto-updater — checks GitHub releases for new versions.
require_once __DIR__ . '/vendor/autoload.php';

use YahnisElsts\PluginUpdateChecker\v5\PucFactory;

$repurposa_updater = PucFactory::buildUpdateChecker(
    'https://github.com/LaupWing/repurposa/',
    __FILE__,
    'repurposa'
);
$repurposa_updater->setAuthentication( defined( 'SNEL_SEO_GITHUB_TOKEN' ) ? constant( 'SNEL_SEO_GITHUB_TOKEN' ) : '' );
/** @var \YahnisElsts\PluginUpdateChecker\v5p5\Vcs\GitHubApi $api */
$api = $repurposa_updater->getVcsApi();
$api->enableReleaseAssets();

// Define plugin constants
define('REPURPOSA_VERSION', '1.0.50');
define('REPURPOSA_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('REPURPOSA_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Add admin menu with submenus
 */
add_action('admin_menu', 'repurposa_add_admin_menu');

function repurposa_add_admin_menu() {
    // Main menu page (also serves as "Create Blog")
    $main_hook = add_menu_page(
        'Repurposa',
        'Repurposa',
        'manage_options',
        'repurposa',
        'repurposa_render_page_create',
        'dashicons-edit-large',
        30
    );

    // Submenu: Create Blog (same as main, but explicit in submenu)
    $create_hook = add_submenu_page(
        'repurposa',           // Parent slug
        'Create Blog',              // Page title
        'Create Blog',              // Menu title
        'manage_options',           // Capability
        'repurposa',           // Menu slug (same as parent = replaces "Repurposa" text)
        'repurposa_render_page_create'   // Callback
    );

    // Submenu: Blogs
    $blogs_hook = add_submenu_page(
        'repurposa',
        'Blogs',
        'Blogs',
        'manage_options',
        'repurposa-blogs',
        'repurposa_render_page_blogs'
    );

    // Submenu: Schedule
    $schedule_hook = add_submenu_page(
        'repurposa',
        'Schedule',
        'Schedule',
        'manage_options',
        'repurposa-schedule',
        'repurposa_render_page_schedule'
    );

    // Submenu: Analytics
    $analytics_hook = add_submenu_page(
        'repurposa',
        'Analytics',
        'Analytics',
        'manage_options',
        'repurposa-analytics',
        'repurposa_render_page_analytics'
    );

    // Submenu: Settings
    $connections_hook = add_submenu_page(
        'repurposa',
        'Settings',
        'Settings',
        'manage_options',
        'repurposa-settings',
        'repurposa_render_page_settings'
    );

    // Collect all hooks to load scripts on any of our pages
    $all_hooks = [$main_hook, $create_hook, $blogs_hook, $schedule_hook, $analytics_hook, $connections_hook];

    // Load scripts on all our pages
    add_action('admin_enqueue_scripts', function($current_hook) use ($all_hooks) {
        if (!in_array($current_hook, $all_hooks)) {
            return;
        }

        $asset_file = REPURPOSA_PLUGIN_DIR . 'build/index.asset.php';

        if (!file_exists($asset_file)) {
            return;
        }

        $assets = include($asset_file);

        wp_enqueue_script(
            'repurposa-admin',
            REPURPOSA_PLUGIN_URL . 'build/index.js',
            $assets['dependencies'],
            $assets['version'],
            true
        );

        wp_enqueue_style(
            'repurposa-admin',
            REPURPOSA_PLUGIN_URL . 'build/index.css',
            [],
            $assets['version']
        );

        wp_enqueue_style('wp-components');

        wp_enqueue_style(
            'repurposa-fonts',
            REPURPOSA_PLUGIN_URL . 'assets/fonts/fonts.css',
            [],
            $assets['version']
        );

        // Snelstack theme detection — null if not active
        $snelstack_lang = function_exists('snel_get_lang')
            ? apply_filters('snel_seo_current_language', 'en')
            : null;

        // Pass config to React (Sanctum token + Laravel API URL + Snelstack lang)
        wp_localize_script('repurposa-admin', 'repurposaConfig', [
            'apiUrl'        => defined('REPURPOSA_API_URL') ? REPURPOSA_API_URL : 'https://ai-blog-tool.test',
            'token'         => get_option('repurposa_auth_token', ''),
            'snelstackLang' => $snelstack_lang,
        ]);

        // Enqueue WordPress media library
        wp_enqueue_media();
    });
}

/**
 * Render pages - each passes the page type to React via data attribute
 */
function repurposa_render_page_create() {
    repurposa_render_app('create');
}

function repurposa_render_page_blogs() {
    // Check if viewing a specific blog
    if (isset($_GET['post_id'])) {
        repurposa_render_app('blog-view', intval($_GET['post_id']));
    } else {
        repurposa_render_app('blogs');
    }
}

function repurposa_render_page_schedule() {
    repurposa_render_app('schedule');
}

function repurposa_render_page_analytics() {
    repurposa_render_app('analytics');
}

function repurposa_render_page_settings() {
    repurposa_render_app('settings');
}

/**
 * Render the React app container with page type
 */
function repurposa_render_app($page, $post_id = null) {
    ?>
    <div class="wrap">
        <div id="repurposa-app"
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
add_action('rest_api_init', 'repurposa_register_rest_routes');

function repurposa_register_rest_routes() {
    // Auth token route — stores/retrieves the Sanctum token
    register_rest_route('repurposa/v1', '/auth/token', [
        [
            'methods' => 'GET',
            'callback' => function() {
                $token = get_option('repurposa_auth_token', '');
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

                update_option('repurposa_auth_token', $token);
                return new WP_REST_Response(['success' => true], 200);
            },
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
        [
            'methods' => 'DELETE',
            'callback' => function() {
                delete_option('repurposa_auth_token');
                return new WP_REST_Response(['success' => true], 200);
            },
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ],
    ]);

    // Publish route — creates/updates a real WordPress post from Laravel data
    register_rest_route('repurposa/v1', '/posts/(?P<id>\d+)/publish', [
        [
            'methods' => 'POST',
            'callback' => 'repurposa_publish_blog',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ],
    ]);

    // Return all published WP posts for syncing into Laravel
    register_rest_route('repurposa/v1', '/wp-posts', [
        [
            'methods' => 'GET',
            'callback' => function () {
                $posts = get_posts([
                    'post_type'      => 'post',
                    'post_status'    => 'publish',
                    'posts_per_page' => -1,
                ]);

                // Detect site default language for the lang field
                $site_lang = 'en';
                if (function_exists('snel_get_default_lang')) {
                    $site_lang = snel_get_default_lang();
                } else {
                    $locale = get_locale(); // e.g. "nl_NL", "en_US"
                    $lang_prefix = strtolower(substr($locale, 0, 2));
                    $site_lang = in_array($lang_prefix, ['en', 'nl']) ? $lang_prefix : 'en';
                }

                return array_map(function ($post) use ($site_lang) {
                    return [
                        'id'        => $post->ID,
                        'title'     => $post->post_title,
                        'content'   => repurposa_extract_post_content($post->post_content, get_permalink($post->ID)),
                        'excerpt'   => $post->post_excerpt,
                        'url'       => get_permalink($post->ID),
                        'thumbnail' => get_the_post_thumbnail_url($post->ID, 'full') ?: null,
                        'date'      => $post->post_date,
                        'lang'      => $site_lang,
                    ];
                }, $posts);
            },
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ],
    ]);

    register_rest_route('repurposa/v1', '/wp-posts/(?P<id>\d+)', [
        [
            'methods' => 'GET',
            'callback' => function ($request) {
                $post = get_post((int) $request['id']);

                if (!$post || $post->post_status !== 'publish') {
                    return new WP_Error('not_found', 'Post not found', ['status' => 404]);
                }

                $site_lang = 'en';
                if (function_exists('snel_get_default_lang')) {
                    $site_lang = snel_get_default_lang();
                } else {
                    $locale = get_locale();
                    $lang_prefix = strtolower(substr($locale, 0, 2));
                    $site_lang = in_array($lang_prefix, ['en', 'nl']) ? $lang_prefix : 'en';
                }

                return [
                    'id'        => $post->ID,
                    'title'     => $post->post_title,
                    'content'   => repurposa_extract_post_content($post->post_content, get_permalink($post->ID)),
                    'excerpt'   => $post->post_excerpt,
                    'url'       => get_permalink($post->ID),
                    'thumbnail' => get_the_post_thumbnail_url($post->ID, 'full') ?: null,
                    'date'      => $post->post_date,
                    'lang'      => $site_lang,
                ];
            },
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ],
    ]);
}

/**
 * Fetch the rendered frontend page and extract the prose content div.
 * Falls back to stripping block comment markers if the request fails.
 */
function repurposa_extract_post_content($post_content, $permalink) {
    $response = wp_remote_get($permalink, ['timeout' => 15]);

    if (is_wp_error($response)) {
        return preg_replace('/<!--\s*\/?wp:[^>]*-->\n?/m', '', $post_content);
    }

    $html = wp_remote_retrieve_body($response);

    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);
    libxml_clear_errors();

    $xpath = new DOMXPath($dom);
    $nodes = $xpath->query('//*[contains(@class, "prose")]');

    if ($nodes->length === 0) {
        return preg_replace('/<!--\s*\/?wp:[^>]*-->\n?/m', '', $post_content);
    }

    $prose = $nodes->item(0);
    $inner = '';
    foreach ($prose->childNodes as $child) {
        $inner .= $dom->saveHTML($child);
    }

    return trim($inner);
}

/**
 * Publish a blog as a real WordPress post.
 * Receives { title, content, thumbnail } directly from the frontend.
 * The id param is the Laravel post ID, stored as meta for tracking.
 */
function repurposa_publish_blog(WP_REST_Request $request) {
    $laravel_id = $request->get_param('id');
    $data = $request->get_json_params();

    $title = sanitize_text_field($data['title'] ?? '');
    $content = wp_unslash($data['content'] ?? '');
    $thumbnail = esc_url_raw($data['thumbnail'] ?? '');

    if (empty($title) && empty($content)) {
        return new WP_REST_Response(['error' => 'Title or content is required'], 400);
    }

    // Check if we already published this Laravel post
    $existing_posts = get_posts([
        'post_type' => 'post',
        'meta_key' => '_repurposa_laravel_id',
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
            repurposa_set_featured_image($wp_post_id, $thumbnail);
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
    update_post_meta($wp_post_id, '_repurposa_laravel_id', $laravel_id);

    if (!empty($thumbnail)) {
        repurposa_set_featured_image($wp_post_id, $thumbnail);
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
function repurposa_set_featured_image($post_id, $image_url) {
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

