from pathlib import Path
p=Path('/etc/nginx/sites-enabled/test.touhou.vip');s=p.read_text();Path('/opt/th13-test-20261029/nginx-before.conf').write_text(s)
assert 'location ^~ /games/th13/' not in s
s=s.replace('    location ^~ /games/ {','''    # TH13 Japanese test content, independently mounted from the program publication.
    location ^~ /games/th13/ {
        alias /var/www/eagler-touhou-test-resources/th13-ja-8f5f6cb0/;
        add_header Cache-Control $test_touhou_cache_control always;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Expose-Headers Content-Length,Content-Range,Accept-Ranges,ETag always;
    }

    location ^~ /games/ {''')
s=s.replace('        # TH075 language packs are served by this site at the canonical path.','        if ($arg_path ~* "^(%2f|/)games(%2f|/)th13(%2f|/)") { return 404; }\n        # TH075 language packs are served by this site at the canonical path.')
Path('/opt/th13-test-20261029/nginx-after.conf').write_text(s)
print('resource_mount_prepared')
