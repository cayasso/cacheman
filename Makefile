BABEL = ./node_modules/.bin/babel

all: node

node: lib
	@mkdir -p node/
	$(BABEL) lib -d node

clean:
	rm -rf node/

test:
	@./node_modules/.bin/mocha \
		--reporter spec \
		--require should \
		--require babel/register \
		--recursive \
		test

.PHONY: all clean test